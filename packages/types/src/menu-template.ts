import type { MenuCategory } from './menu.js';

/** Stable keys for starter onboarding template rows — used by admin UI and API validation. */
export type MenuTemplateDrinkKey =
  | 'espresso'
  | 'americano'
  | 'cortado'
  | 'flat-white'
  | 'latte'
  | 'cappuccino'
  | 'mocha'
  | 'hot-chocolate'
  | 'breakfast-tea'
  | 'chai-latte'
  | 'matcha-latte'
  | 'babycino'
  | 'iced-latte'
  | 'iced-americano'
  | 'iced-chocolate'
  | 'iced-mocha'
  | 'iced-matcha-latte';

export type MenuTemplateModifierKey =
  | 'whole'
  | 'skinny'
  | 'oat'
  | 'almond'
  | 'coconut'
  | 'soy'
  | 'cashew'
  | 'vanilla'
  | 'caramel'
  | 'hazelnut'
  | 'white-chocolate'
  | 'strawberry'
  | 'raspberry'
  | 'blueberry'
  | 'salted-caramel'
  | 'honey';

export type MenuTemplateCategoryKey = MenuCategory | 'milks' | 'syrups';

export const MENU_TEMPLATE_DEFAULT_DRINK_PRICE_MINOR = 350;
export const MENU_TEMPLATE_SYRUP_PRICE_MINOR = 30;
export const MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR = 50;

export interface MenuTemplateDrinkDef {
  key: MenuTemplateDrinkKey;
  name: string;
  category: Extract<MenuCategory, 'hot_drinks' | 'cold_drinks'>;
  defaultSelected: boolean;
  defaultDescription: string;
  subcategory?: string;
}

export interface MenuTemplateModifierDef {
  key: MenuTemplateModifierKey;
  name: string;
  defaultSelected: boolean;
  /** Minor units; dairy milks default to 0 */
  defaultPriceMinor: number;
  isDefault?: boolean;
}

export interface MenuTemplateCategoryDef {
  key: MenuTemplateCategoryKey;
  label: string;
  /** When true the category toggle is locked on (Hot drinks, Milks). */
  disableToggle: boolean;
  kind: 'drinks' | 'modifiers';
  drinks?: MenuTemplateDrinkDef[];
  modifiers?: MenuTemplateModifierDef[];
}

export interface AdminMenuTemplateDrinkInput {
  templateKey: MenuTemplateDrinkKey;
  name: string;
  description: string;
  priceMinor: number;
  category: Extract<MenuCategory, 'hot_drinks' | 'cold_drinks'>;
  enabled: boolean;
}

export interface AdminMenuTemplateModifierInput {
  templateKey: MenuTemplateModifierKey;
  name: string;
  priceMinor: number;
  enabled: boolean;
  isDefault: boolean;
}

export interface AdminMenuTemplateCategoryInput {
  key: MenuTemplateCategoryKey;
  enabled: boolean;
  drinks?: AdminMenuTemplateDrinkInput[];
  modifiers?: AdminMenuTemplateModifierInput[];
}

export interface AdminSaveMenuTemplateRequest {
  categories: AdminMenuTemplateCategoryInput[];
}

export interface AdminSaveMenuTemplateResponse {
  itemCount: number;
  milksGroupId: string;
  syrupsGroupId: string;
}

const DRINK = (def: MenuTemplateDrinkDef): MenuTemplateDrinkDef => ({
  ...def,
});

const MOD = (def: MenuTemplateModifierDef): MenuTemplateModifierDef => ({
  ...def,
});

/** Canonical starter menu — single source for onboarding UI and API validation. */
export const MENU_TEMPLATE_CATEGORIES: MenuTemplateCategoryDef[] = [
  {
    key: 'hot_drinks',
    label: 'Hot drinks',
    disableToggle: true,
    kind: 'drinks',
    drinks: [
      DRINK({
        key: 'espresso',
        name: 'Espresso',
        category: 'hot_drinks',
        defaultSelected: true,
        defaultDescription: 'A concentrated shot of espresso.',
        subcategory: 'coffee',
      }),
      DRINK({
        key: 'americano',
        name: 'Americano',
        category: 'hot_drinks',
        defaultSelected: true,
        defaultDescription: 'Espresso topped with hot water.',
        subcategory: 'coffee',
      }),
      DRINK({
        key: 'cortado',
        name: 'Cortado',
        category: 'hot_drinks',
        defaultSelected: true,
        defaultDescription: 'Espresso balanced with steamed milk.',
        subcategory: 'coffee',
      }),
      DRINK({
        key: 'flat-white',
        name: 'Flat white',
        category: 'hot_drinks',
        defaultSelected: true,
        defaultDescription: 'Velvety microfoam over a double espresso.',
        subcategory: 'coffee',
      }),
      DRINK({
        key: 'latte',
        name: 'Latte',
        category: 'hot_drinks',
        defaultSelected: true,
        defaultDescription: 'Espresso with steamed milk.',
        subcategory: 'coffee',
      }),
      DRINK({
        key: 'cappuccino',
        name: 'Cappuccino',
        category: 'hot_drinks',
        defaultSelected: true,
        defaultDescription: 'Equal parts espresso, steamed milk, and foam.',
        subcategory: 'coffee',
      }),
      DRINK({
        key: 'mocha',
        name: 'Mocha',
        category: 'hot_drinks',
        defaultSelected: true,
        defaultDescription: 'Espresso with chocolate and steamed milk.',
        subcategory: 'coffee',
      }),
      DRINK({
        key: 'hot-chocolate',
        name: 'Hot chocolate',
        category: 'hot_drinks',
        defaultSelected: true,
        defaultDescription: 'Rich steamed chocolate drink.',
        subcategory: 'chocolate',
      }),
      DRINK({
        key: 'breakfast-tea',
        name: 'Breakfast tea',
        category: 'hot_drinks',
        defaultSelected: true,
        defaultDescription: 'Classic black tea served hot.',
        subcategory: 'tea',
      }),
      DRINK({
        key: 'chai-latte',
        name: 'Chai latte',
        category: 'hot_drinks',
        defaultSelected: false,
        defaultDescription: 'Spiced tea with steamed milk.',
        subcategory: 'tea',
      }),
      DRINK({
        key: 'matcha-latte',
        name: 'Matcha latte',
        category: 'hot_drinks',
        defaultSelected: false,
        defaultDescription: 'Ceremonial matcha whisked with steamed milk.',
        subcategory: 'matcha',
      }),
      DRINK({
        key: 'babycino',
        name: 'Babycino',
        category: 'hot_drinks',
        defaultSelected: false,
        defaultDescription: 'Warm frothy milk for little ones.',
        subcategory: 'coffee',
      }),
    ],
  },
  {
    key: 'cold_drinks',
    label: 'Cold drinks',
    disableToggle: false,
    kind: 'drinks',
    drinks: [
      DRINK({
        key: 'iced-latte',
        name: 'Iced latte',
        category: 'cold_drinks',
        defaultSelected: true,
        defaultDescription: 'Espresso and chilled milk over ice.',
        subcategory: 'coffee',
      }),
      DRINK({
        key: 'iced-americano',
        name: 'Iced americano',
        category: 'cold_drinks',
        defaultSelected: true,
        defaultDescription: 'Espresso and cold water over ice.',
        subcategory: 'coffee',
      }),
      DRINK({
        key: 'iced-chocolate',
        name: 'Iced chocolate',
        category: 'cold_drinks',
        defaultSelected: false,
        defaultDescription: 'Chocolate and milk served over ice.',
        subcategory: 'chocolate',
      }),
      DRINK({
        key: 'iced-mocha',
        name: 'Iced mocha',
        category: 'cold_drinks',
        defaultSelected: false,
        defaultDescription: 'Espresso, chocolate, and milk over ice.',
        subcategory: 'coffee',
      }),
      DRINK({
        key: 'iced-matcha-latte',
        name: 'Iced matcha latte',
        category: 'cold_drinks',
        defaultSelected: false,
        defaultDescription: 'Matcha and chilled milk over ice.',
        subcategory: 'matcha',
      }),
    ],
  },
  {
    key: 'syrups',
    label: 'Syrups',
    disableToggle: false,
    kind: 'modifiers',
    modifiers: [
      MOD({ key: 'vanilla', name: 'Vanilla', defaultSelected: true, defaultPriceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR }),
      MOD({ key: 'caramel', name: 'Caramel', defaultSelected: true, defaultPriceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR }),
      MOD({ key: 'hazelnut', name: 'Hazelnut', defaultSelected: true, defaultPriceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR }),
      MOD({ key: 'white-chocolate', name: 'White chocolate', defaultSelected: false, defaultPriceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR }),
      MOD({ key: 'strawberry', name: 'Strawberry', defaultSelected: false, defaultPriceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR }),
      MOD({ key: 'raspberry', name: 'Raspberry', defaultSelected: false, defaultPriceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR }),
      MOD({ key: 'blueberry', name: 'Blueberry', defaultSelected: false, defaultPriceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR }),
      MOD({ key: 'salted-caramel', name: 'Salted caramel', defaultSelected: false, defaultPriceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR }),
      MOD({ key: 'honey', name: 'Honey', defaultSelected: false, defaultPriceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR }),
    ],
  },
  {
    key: 'milks',
    label: 'Milks',
    disableToggle: true,
    kind: 'modifiers',
    modifiers: [
      MOD({ key: 'whole', name: 'Whole', defaultSelected: true, defaultPriceMinor: 0, isDefault: true }),
      MOD({ key: 'skinny', name: 'Skinny', defaultSelected: true, defaultPriceMinor: 0 }),
      MOD({ key: 'oat', name: 'Oat', defaultSelected: true, defaultPriceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR }),
      MOD({ key: 'almond', name: 'Almond', defaultSelected: false, defaultPriceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR }),
      MOD({ key: 'coconut', name: 'Coconut', defaultSelected: false, defaultPriceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR }),
      MOD({ key: 'soy', name: 'Soy', defaultSelected: false, defaultPriceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR }),
      MOD({ key: 'cashew', name: 'Cashew', defaultSelected: false, defaultPriceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR }),
    ],
  },
];
