/** Выбор роли при входе: две плитки-радио с подписью, что даёт каждая роль. Отмеченная обведена акцентом. */
export function RoleChoice({ defaultRole }: { defaultRole: "teacher" | "student" }) {
  const options = [
    { value: "teacher", title: "Преподаватель", text: "Загружаю материалы и собираю уроки" },
    { value: "student", title: "Студент", text: "Прохожу уроки по коду курса" },
  ] as const;
  return (
    <fieldset>
      <legend className="text-sm font-medium">Роль</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-input px-3 py-3 transition-colors hover:border-foreground/40 has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40"
          >
            <input type="radio" name="role" value={o.value} defaultChecked={defaultRole === o.value} className="mt-1" />
            <span>
              <span className="block text-sm font-medium">{o.title}</span>
              <span className="block type-caption text-muted-foreground">{o.text}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
