import Link from "next/link";

/** Два чекбокса согласия (docs/legal/consent.md): обязательное на обработку данных и необязательное
 *  на письма о программах. Ни один не отмечен по умолчанию: так требует ст. 9 152-ФЗ.
 *  Ссылки открываются в новой вкладке, чтобы не потерять заполненную форму. */
export function ConsentFields({ showMarketing = true }: { showMarketing?: boolean }) {
  return (
    <div className="space-y-3 text-sm">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" name="consent_processing" value="1" required className="mt-1" />
        <span>
          Соглашаюсь на обработку моих данных для работы сервиса на условиях{" "}
          <Link href="/legal/consent" target="_blank" className="underline hover:text-primary">Согласия</Link> и{" "}
          <Link href="/legal/privacy" target="_blank" className="underline hover:text-primary">Политики</Link>.
        </span>
      </label>
      {showMarketing ? (
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="consent_marketing" value="1" className="mt-1" />
          <span>
            Присылайте мне письма о программах To Dual.{" "}
            <span className="text-muted-foreground">Необязательно. Согласие можно отозвать в любой момент в разделе «Мои данные».</span>
          </span>
        </label>
      ) : null}
    </div>
  );
}
