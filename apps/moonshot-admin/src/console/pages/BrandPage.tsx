import { Box } from '@mui/material';
import { PageHeader } from '../primitives/PageHeader.js';
import { BrandEditorCard } from './brand/BrandEditorCard.js';
import { ReviewNudgeCard } from './brand/ReviewNudgeCard.js';

export function BrandPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <PageHeader
        title="Brand"
        description="Pick a base look, then your colour and heading font. Body text stays as it is so the menu is always easy to read."
      />
      <BrandEditorCard />
      <ReviewNudgeCard />
    </Box>
  );
}
