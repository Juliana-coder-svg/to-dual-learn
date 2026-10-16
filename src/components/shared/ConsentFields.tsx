import Link from "next/link";

/** Два чекбокса согласия (docs/legal/consent.md): обязательное на обработку данных и необязательное
 *  на письма о программах. Ни один не отмечен по умолчанию: так требует ст. 9 152-ФЗ.
 *  Оба в одной рамке: на телефоне форма входа должна помещаться в один экран.
 *  Ссылки открываются в новой вкладке, чтобы не потерять заполненную форму. */
export function ConsentFields({ showMarketing = true }: { showMarketing?: boolean }) {
  const row = "flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm leading-snug has-[:focus-visible]:bg-muted/60";
  return (
    <div className="divide-y overflow-hidden rounded-xl border border-input">
      <label className={row}>
        <input type="checkbox" name="consent_processing" value="1" required className="mt-0.5 size-4 shrink-0" />
        <span>
          Соглашаюсь на обработку моих данных для работы сервиса на условиях{" "}
          <Link href="/legal/consent" target="_blank" className="underline underline-offset-4 hover:text-primary-strong">Согласия</Link> и{" "}
          <Link href="/legal/privacy" target="_blank" className="underline underline-offset-4 hover:text-primary-strong">Политики</Link>.
        </span>
      </label>
      {showMarketing ? (
        <label className={row}>
          <input type="checkbox" name="consent_marketing" value="1" className="mt-0.5 size-4 shrink-0" />
          <span>
            Хочу получать письма о программах TO DUAL.{" "}
            <span className="text-muted-foreground">Необязательно. Отозвать можно в разделе «Мои данные».</span>
          </span>
        </label>
      ) : null}
    </div>
  );
}
