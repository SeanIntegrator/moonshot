import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { extractMenu, ExtractionError } from './extract-menu.js';
import type { AnthropicLike } from './extraction/anthropic-client.js';

/** Small JPEG so `sharp` has a real buffer to normalise. 32×32 solid white. */
async function tinyJpeg(): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .jpeg()
    .toBuffer();
}

/** Build a mock client whose `messages.create` returns the given text. */
function clientReturning(text: string, stopReason: string = 'end_turn'): AnthropicLike {
  return {
    messages: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: vi.fn(async () => ({
        content: [{ type: 'text', text }],
        usage: { input_tokens: 100, output_tokens: 200 },
        stop_reason: stopReason,
      })) as any,
    },
  };
}

describe('extractMenu', () => {
  it('parses a plain JSON response into an ExtractedMenu', async () => {
    const jpeg = await tinyJpeg();
    const menuJson = JSON.stringify({
      sections: [{ name: 'Coffee', kind: 'drinks' }],
      items: [{ name: 'Flat white', section: 'Coffee', price: '3.50' }],
    });
    const client = clientReturning(menuJson);

    const result = await extractMenu({ files: [{ buffer: jpeg }], client });

    expect(result.menu.items).toHaveLength(1);
    expect(result.menu.items[0]?.name).toBe('Flat white');
    expect(result.meta.pageCount).toBe(1);
    expect(result.meta.inputTokens).toBe(100);
  });

  it('strips ```json fences before parsing', async () => {
    const jpeg = await tinyJpeg();
    const client = clientReturning(
      '```json\n{"sections":[],"items":[{"name":"Latte","price":"3.80"}]}\n```'
    );

    const result = await extractMenu({ files: [{ buffer: jpeg }], client });
    expect(result.menu.items[0]?.name).toBe('Latte');
  });

  it('throws ExtractionError when the response is not valid JSON', async () => {
    const jpeg = await tinyJpeg();
    const client = clientReturning('Sorry, I cannot read this menu.');

    await expect(extractMenu({ files: [{ buffer: jpeg }], client })).rejects.toBeInstanceOf(
      ExtractionError
    );
  });

  it('throws ExtractionError when the JSON does not match the schema', async () => {
    const jpeg = await tinyJpeg();
    const client = clientReturning(JSON.stringify({ sections: 'not-an-array', items: [] }));

    await expect(extractMenu({ files: [{ buffer: jpeg }], client })).rejects.toBeInstanceOf(
      ExtractionError
    );
  });

  it('passes each prepared image to the model as a base64 image block', async () => {
    const jpeg = await tinyJpeg();
    const client = clientReturning(JSON.stringify({ sections: [], items: [] }));

    await extractMenu({ files: [{ buffer: jpeg }, { buffer: jpeg }], client });

    const createMock = client.messages.create as unknown as ReturnType<typeof vi.fn>;
    expect(createMock).toHaveBeenCalledTimes(1);
    const [args] = createMock.mock.calls[0] as [
      {
        messages: Array<{
          role: string;
          content: Array<{ type: string; source?: { media_type: string } }>;
        }>;
        output_config?: {
          format?: {
            type?: string;
            schema?: {
              properties?: {
                sections?: {
                  items?: { required?: string[]; properties?: { kind?: { enum?: string[] } } };
                };
              };
            };
          };
        };
      },
    ];
    const content = args.messages[0]!.content;
    const imageBlocks = content.filter((b) => b.type === 'image');
    expect(imageBlocks).toHaveLength(2);
    expect(imageBlocks[0]?.source?.media_type).toBe('image/jpeg');
    // Images come before the trailing text instruction block.
    expect(content[content.length - 1]?.type).toBe('text');
    const sectionSchema = args.output_config?.format?.schema?.properties?.sections?.items;
    expect(args.output_config?.format?.type).toBe('json_schema');
    expect(sectionSchema?.required).toContain('kind');
    expect(sectionSchema?.properties?.kind?.enum).toEqual([
      'food',
      'drinks',
      'specials',
      'kids',
      'evening',
      'other',
    ]);
  });
});
