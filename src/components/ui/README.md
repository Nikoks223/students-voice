# UI Component Library

Dark-only primitives for Средношколски Глас. Import from the barrel:

```js
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Input,
  Textarea,
  Chip,
  Avatar,
  Skeleton,
  Tabs,
  Tooltip,
  Spinner,
} from '../components/ui';
```

When migrating a page, replace ad-hoc buttons/cards/modals with these. Don't add unrelated changes in the same commit.

---

## Button

```jsx
<Button variant="primary" size="md" onClick={save}>Зачувај</Button>
<Button variant="secondary" loading={saving}>Зачувај</Button>
<Button variant="ghost" leftIcon={<SomeIcon />}>Назад</Button>
<Button variant="destructive" size="sm">Избриши</Button>
<Button variant="link">Прочитај повеќе</Button>
```

Variants: `primary` | `secondary` | `ghost` | `destructive` | `link`
Sizes: `sm` | `md` (default) | `lg` | `icon`

---

## Card

```jsx
<Card variant="default" className="p-5">Content</Card>
<Card variant="hover" className="p-5 cursor-pointer">Clickable card</Card>
<Card variant="elevated" className="p-6">Modal-style card</Card>
<Card variant="glass" className="p-4">Floating panel</Card>
```

---

## Dialog

```jsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="secondary">Отвори</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Потврди акција</DialogTitle>
      <DialogDescription>Оваа акција е неповратна.</DialogDescription>
    </DialogHeader>
    <div className="px-6 py-4">…body…</div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="ghost">Откажи</Button>
      </DialogClose>
      <Button variant="destructive">Потврди</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Input

```jsx
<Input label="Наслов" placeholder="Внеси наслов…" />
<Input label="Е-маил" type="email" error="Невалидна адреса" />
<Input label="Пребарај" leftIcon={<SearchIcon size={14} />} hint="Минимум 3 знаци" />
```

---

## Textarea

```jsx
<Textarea label="Коментар" placeholder="Напиши коментар…" rows={4} />
<Textarea label="Опис" error="Задолжително поле" />
```

---

## Chip

```jsx
<Chip variant="iris">Натура</Chip>
<Chip variant="coral" size="xs">Ново</Chip>
<Chip variant="default" onRemove={() => remove(id)}>Тагот</Chip>
```

Variants: `default` | `iris` | `cyan` | `coral` | `sun` | `mint` | `outline`
Sizes: `xs` | `sm` (default) | `md`

---

## Avatar

```jsx
<Avatar username="stojan_mk" avatarUrl={url} size="md" />
<Avatar user={userProfile} size="lg" />
```

Sizes: `xs` | `sm` | `md` (default) | `lg` | `xl`

---

## Skeleton

```jsx
<Skeleton variant="rect" className="w-full h-32" />
<Skeleton variant="text" className="w-48" />
<Skeleton variant="circle" className="w-9 h-9" />
```

---

## Tabs

```jsx
<Tabs
  value={tab}
  onValueChange={setTab}
  options={[
    { value: 'latest', label: 'Најново' },
    { value: 'hot', label: 'Трендирачки', badge: 3 },
  ]}
/>
```

---

## Tooltip

```jsx
<Tooltip content="Копирај линк" side="top">
  <Button variant="icon" size="icon">
    <CopyIcon />
  </Button>
</Tooltip>
```

---

## Spinner

```jsx
<Spinner size="md" />
<Spinner size="sm" className="text-accent" />
```

Sizes: `xs` | `sm` | `md` (default) | `lg`
