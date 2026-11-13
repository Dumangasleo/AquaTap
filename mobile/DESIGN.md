# AquaTap mobile design guide ("Soft Aqua")

Screens are styled with **Tailwind classes** (`className="..."`) through [Uniwind](https://docs.uniwind.dev) (Tailwind v4).
Tokens live in [`src/global.css`](src/global.css); the same colors exist in [`src/theme/tokens.ts`](src/theme/tokens.ts) for the few
places where a class cannot be used (icon `color`, SVG, map, navigation options).

## 1. Rules

1. **No `StyleSheet.create` in screens and features.** Use `className`. Use the `style` prop only for values computed at run time
   (a width from data, safe-area insets, a tone color from a map).
2. **Write full class names.** Tailwind cannot see `` `bg-${tone}` ``. Use a lookup object of complete strings, or `toneClasses[tone]`.
3. **Merge classes with `cn()`** from `src/utils/cn.ts`: `cn('p-4', isSelected && 'bg-brand-soft')`.
4. **Compose from `src/components/ui`.** Do not rebuild a button, card, field, badge, list row or dialog by hand.
5. **Touch targets are at least 48 px high.** One primary button per screen; put it in the `footer` of `<Screen>` when the screen is a form.
6. **Never show color alone.** A status always has words (and usually an icon).
7. **A word is never split in the middle** ("PAY / MENT"). React Native only breaks inside a word when that one word is wider
   than its box, so fix the box, in this order:
   1. Give the text room: put the icon above the label (see `StatCard`), let rows wrap (`flex-row flex-wrap` + a `min-w-[...]`),
      and let a value next to a label shrink too (`shrink max-w-[60%]`, see `KeyValueRow`).
   2. Short one-line labels (buttons, 3-column choices, segments): `numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}`.
   3. Use a shorter word (section 6).
   Never fix it by making the text smaller than 12 px.
8. **Respect the phone's font size, within limits.** `AppText` caps how much small variants grow (`overline`/`tiny` 1.25×,
   `label`/`title`/`display` 1.3×, `heading`/`caption` 1.4×); `body` follows the phone. Check every screen with the phone's
   largest font size, and at 320, 360 and 430 px wide.
9. **Everything you can tap reacts.** Tappable boxes use `PressableScale` (shrinks while pressed, springs back) — `Button`, `Card`,
   `OptionCards`, `IconButton` and `SegmentedControl` already do. List rows and table rows only change their background.
10. **Motion is short and quiet:** 150–300 ms, ease-out, animate only `transform` and `opacity`. Every animation checks
    `useReducedMotion()` (`src/hooks/use-reduced-motion.ts`) and shows the final state right away when the phone asks for less motion.

## 2. Tokens (Tailwind classes)

| Use | Classes |
|---|---|
| Brand blue | `bg-brand` `text-brand` `border-brand` · pressed `bg-brand-pressed` · light `bg-brand-soft` · light border `border-brand-line` · dark `bg-brand-deep` |
| Aqua accent | `text-aqua` `bg-aqua-soft` |
| Page / boxes | `bg-canvas` (page) · `bg-surface` (white box) · `bg-surface-muted` |
| Lines | `border-line` · `border-line-strong` |
| Text | `text-ink` (main) · `text-ink-muted` (secondary) · `text-ink-subtle` (hints) · `text-on-brand` (white on blue) |
| Status | `text-success` `bg-success-soft` · `text-warning` `bg-warning-soft` · `text-danger` `bg-danger-soft` · `text-info` `bg-info-soft` · `bg-neutral-soft` |
| Radius | `rounded-field` (16, inputs/buttons) · `rounded-card` (24) · `rounded-sheet` (32) · `rounded-full` |
| Spacing | Tailwind scale: `gap-2` = 8, `gap-3` = 12, `p-4` = 16, `p-5` = 20. Screen padding is `p-4`, space between blocks `gap-4`. |

Fonts are set by `<AppText variant>`; do not use `font-bold` / `font-semibold` (Android needs one font file per weight).
Text and labels use **Nunito Sans**; titles (`display`, `title`, `heading`) and big numbers use **Varela Round** (rounded, one weight).
If you must change the font: `font-body` (400) `font-body-medium` (500) `font-body-strong` (600) `font-heading` (700, bold labels and buttons)
`font-display` (Varela Round, titles and big numbers).

## 3. Text: `<AppText variant className>`

| Variant | Use |
|---|---|
| `display` (28) | The one big number or greeting of a screen |
| `title` (22) | Screen title, dialog title |
| `heading` (18) | Card title |
| `body` (16) / `bodyStrong` | Reading text / emphasized value |
| `label` (14) | Names inside rows and chips |
| **`overline` (12, UPPERCASE, bold, muted)** | **Every label**: above a field, above a number, column headers, small section names |
| `caption` (13) / `tiny` (12) | Helper text |

Color and alignment go in `className`: `<AppText variant="caption" className="text-ink-muted text-center">`.
(The old `color={colors.x}` and `align` props still work but prefer classes.)

## 4. Components (import from `../../components/ui`)

- `Screen` — `header`, `footer`, `onRefresh`, `isRefreshing`, `contentClassName` (default content: `gap-4 p-4 pb-8`), `edges`.
- `ScreenHeader` — `title`, `subtitle`, `showBackButton`, `rightAction`.
- `HeroHeader` — blue water header for the main tab screens. Children use white text (`text-on-brand`). Use `<Screen edges={[]} contentClassName="p-0">` with it.
- `Card` — `className`, `onPress`, `highlightColor`. Already has `p-4`, border and radius.
- `SectionHeader` — UPPERCASE section name + optional `action`.
- `ListGroup` + `ListRow` — menus and settings: `<ListGroup><ListRow title subtitle icon iconTone onPress right /></ListGroup>`.
- `KeyValueRow` — `label`, `value`, `isEmphasized`, `valueColor` for receipts and summaries.
- `Button` — `variant`: `primary | secondary | outline | ghost | danger | success`; `size`: `sm | md | lg`; `icon`, `isLoading`, `isDisabled`, `fullWidth`, `className`.
- `IconButton`, `Badge` (`tone`, `icon`, `showDot`; text is shown UPPERCASE), `Banner` (`tone`, `title`, `message`, `action`), `Divider`.
- `TextField` (label is shown UPPERCASE; `helperText`, `errorText`, `isRequired`, `leftIcon`, `prefix`), `PasswordField`, `CodeField` (6-digit code).
- `NumberStepper`, `OptionCards` (`label`, `options`, `columns`), `SegmentedControl` (`isScrollable` = filter chips), `DateNavigator`.
- `StatCard` (`label` UPPERCASE, `value`, `icon`, `tone`, `caption`), `Avatar` (`fullName`, `imageUri`, `size`).
- `EmptyState`, `LoadingView`, `ErrorView`, `BottomSheet` (background fades, panel slides up), `useToast()`.
- `PressableScale` — `Pressable` with press feedback (`pressedScale`, default `0.97`; cards use `0.985`). Same props and `className`.
- `Icon` takes a `color` value: use `colors.*` from `theme/tokens`.

## 5. Confirmation before every transaction

Anything that creates, changes or removes a record asks first, with a short summary of what will be saved:

```tsx
import { useConfirm } from '../../components/ui';

const confirm = useConfirm();

const placeOrder = async () => {
  const isConfirmed = await confirm({
    title: 'Place this order?',
    message: 'The station will be notified right away.',
    details: [
      { label: 'Gallons', value: '3 gallons' },
      { label: 'Total', value: '₱75.00' },
      { label: 'Payment', value: 'Utang (pay later)' },
    ],
    confirmLabel: 'Yes, place order',
    icon: 'water',
  });
  if (isConfirmed) mutation.mutate();
};
```

- `tone: 'danger'` for cancel / decline / remove / sign out; `tone: 'success'` for "mark as paid" and "delivered".
- Buttons say what will happen: "Yes, cancel order" — not "OK". The cancel button defaults to "No, go back".
- Outside components use `confirmAction()` from `src/utils/confirm.ts` (same options).
- After the action succeeds, show a toast: `showToast('Order placed')`.

## 6. Words (labels and messages)

Write for a customer or rider who is not technical.

- Short and plain: "Gallons to order", "Empty gallons to return", "How will you pay?", "Send proof of payment".
- **Labels are UPPERCASE through the components** (`TextField`, `SectionHeader`, `StatCard`, `Badge`, `overline`). Type them in normal case
  in the code — never type CAPS by hand. Buttons, titles and sentences stay in normal case.
- No system words on screen: ~~KYB~~ → "Business documents"; ~~verification status~~ → "Business check"; ~~payment channel~~ → "GCash or bank account";
  ~~settle credits~~ → "Mark as paid"; ~~ledger~~ → "Gallon history"; ~~remarks~~ → "Note"; ~~reference number~~ → "Reference no. (from your receipt)";
  ~~pending~~ → "Waiting"; ~~failed delivery~~ → "Not delivered"; ~~unpaid~~ → "Not yet paid"; ~~credit~~ → "Utang (pay later)"; ~~invalid~~ → say what to fix.
- Keep "utang", "Time in", "Time out", "GCash" — they are the words the stations already use.
- Error text says what to do: "Enter at least 1 gallon." instead of "Invalid quantity".
- Status and money labels come from `src/utils/format.ts` (`orderStatusLabels`, `paymentTypeLabels`, ...). Do not retype them.

## 7. Layout patterns

```tsx
// Form screen
<Screen header={<ScreenHeader title="New order" showBackButton />} footer={<Button label="Review order" size="lg" fullWidth onPress={review} />}>
  <Card className="gap-4">…</Card>
</Screen>

// Row with a value on the right
<View className="flex-row items-center justify-between gap-3">
  <AppText variant="overline">Remaining gallons</AppText>
  <AppText variant="heading">5</AppText>
</View>

// Two stat cards side by side
<View className="flex-row flex-wrap gap-3">
  <StatCard label="Cash sales" value="₱1,250.00" icon="cash-outline" tone="success" />
  <StatCard label="Utang" value="₱300.00" icon="time-outline" tone="warning" />
</View>
```
