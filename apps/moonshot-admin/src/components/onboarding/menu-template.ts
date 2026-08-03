import type { AdminMenuTemplateCategoryInput, AdminMenuTemplateDrinkInput, AdminMenuTemplateModifierInput, AdminSaveMenuTemplateRequest, MenuTemplateCategoryDef, MenuTemplateDrinkDef, MenuTemplateModifierDef } from '@moonshot/domain';
import { MENU_TEMPLATE_CATEGORIES, MENU_TEMPLATE_DEFAULT_DRINK_PRICE_MINOR } from '@moonshot/domain';

export type MenuTemplateDrinkState = AdminMenuTemplateDrinkInput & {
  expanded?: boolean;
};

export type MenuTemplateModifierState = AdminMenuTemplateModifierInput;

export type MenuTemplateCategoryState = {
  key: MenuTemplateCategoryDef['key'];
  label: string;
  disableToggle: boolean;
  kind: MenuTemplateCategoryDef['kind'];
  enabled: boolean;
  expanded: boolean;
  drinks: MenuTemplateDrinkState[];
  modifiers: MenuTemplateModifierState[];
};

export { MENU_TEMPLATE_CATEGORIES };

function drinkFromDef(def: MenuTemplateDrinkDef): MenuTemplateDrinkState {
  return {
    templateKey: def.key,
    name: def.name,
    description: def.defaultDescription,
    priceMinor: MENU_TEMPLATE_DEFAULT_DRINK_PRICE_MINOR,
    category: def.category,
    enabled: def.defaultSelected,
  };
}

function modifierFromDef(def: MenuTemplateModifierDef): MenuTemplateModifierState {
  return {
    templateKey: def.key,
    name: def.name,
    priceMinor: def.defaultPriceMinor,
    enabled: def.defaultSelected,
    isDefault: def.isDefault === true,
  };
}

/** Initial accordion/checkbox state for the onboarding menu template step. */
export function createInitialMenuTemplateState(): MenuTemplateCategoryState[] {
  return MENU_TEMPLATE_CATEGORIES.map((cat) => {
    const enabled = cat.disableToggle
      ? true
      : cat.key === 'food'
        ? false
        : cat.kind === 'drinks'
          ? hasDefaultSelectedDrink(cat)
          : hasDefaultSelectedModifier(cat);
    return {
      key: cat.key,
      label: cat.label,
      disableToggle: cat.disableToggle,
      kind: cat.kind,
      enabled,
      expanded: enabled,
      drinks: (cat.drinks ?? []).map(drinkFromDef),
      modifiers: (cat.modifiers ?? []).map(modifierFromDef),
    };
  });
}

function hasDefaultSelectedDrink(cat: MenuTemplateCategoryDef): boolean {
  return (cat.drinks ?? []).some((d) => d.defaultSelected);
}

function hasDefaultSelectedModifier(cat: MenuTemplateCategoryDef): boolean {
  return (cat.modifiers ?? []).some((m) => m.defaultSelected);
}

export function buildMenuTemplateSavePayload(
  categories: MenuTemplateCategoryState[],
): AdminSaveMenuTemplateRequest {
  return {
    categories: categories.map((cat) => {
      const base: AdminMenuTemplateCategoryInput = {
        key: cat.key,
        enabled: cat.enabled,
      };
      if (cat.kind === 'drinks') {
        return {
          ...base,
          drinks: cat.drinks.map(
            (d): AdminMenuTemplateDrinkInput => ({
              templateKey: d.templateKey,
              name: d.name.trim(),
              description: d.description.trim(),
              priceMinor: d.priceMinor,
              category: d.category,
              enabled: cat.enabled && d.enabled,
            }),
          ),
        };
      }
      return {
        ...base,
        modifiers: cat.modifiers.map(
          (m): AdminMenuTemplateModifierInput => ({
            templateKey: m.templateKey,
            name: m.name.trim(),
            priceMinor: m.priceMinor,
            enabled: cat.enabled && m.enabled,
            isDefault: m.isDefault,
          }),
        ),
      };
    }),
  };
}

export function countEnabledDrinks(categories: MenuTemplateCategoryState[]): number {
  return categories
    .filter((c) => c.kind === 'drinks' && c.enabled && c.key !== 'food')
    .flatMap((c) => c.drinks)
    .filter((d) => d.enabled).length;
}

export function countEnabledMilks(categories: MenuTemplateCategoryState[]): number {
  const milks = categories.find((c) => c.key === 'milks');
  if (!milks?.enabled) return 0;
  return milks.modifiers.filter((m) => m.enabled).length;
}
