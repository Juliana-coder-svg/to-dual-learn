# Источники для ux-researcher: тон ИИ-наставника и настройки автора курса

Дата: 8 октября 2026. Собрал researcher. Пометки: ПЕРВ = первичный (исследование, документ, страница вендора); ВТОР = пересказ; СНИП = только сниппет поиска, страницу не открывал. В поиске нашлось много нерелевантного, в справку попало только проверенное.

## Десять главных фактов

1. Ни у одного из проверенных инструментов нет настройки «строгость оценки». Строгость задаётся рубрикой (Curipod, Microsoft Teams, Brisk, Eduaide), поля «строго/мягко» нет. [Microsoft](https://support.microsoft.com/en-us/teams/education/ai-feedback-for-educators), [Curipod](https://help.curipod.com/en/articles/739595-can-i-adjust-the-feedback-in-an-ai-feedback-activity)
2. Самый полный набор «голоса» у Coassemble: основной голос, язык по умолчанию, 5 ползунков (дружелюбный/профессиональный, неформальный/формальный и другие), перспектива, длина предложения, предпочитаемые термины, слова-исключения, «звучит как мы» (образец текста). Включается переключателем на каждую генерацию. [Coassemble](https://coassemble.com/resources/the-model-that-builds/brand-voice)
3. Тон разбора в Microsoft Teams: три режима (Basic, Instructional, Coaching), плюс класс, язык и критерии рубрики. [Microsoft](https://support.microsoft.com/en-us/teams/education/ai-feedback-for-educators)
4. Данных о доле пользователей, меняющих настройки ИИ, не нашёл. Старые данные противоречат друг другу: 92% кастомизировали текстовый редактор ([Page et al., CHI 1996](https://chi1996.acm.org/proceedings/papers/Page/srp_txt.html)), а у UIE «более 95% оставили дефолты» (блог-пересказ без метода, 2011: [UIE](https://archive.uie.com/brainsparks/2011/09/14/do-users-change-their-settings/)).
5. В анализе ~74 000 диалогов преподавателей с Claude 57% приходится на разработку курсов и материалов. Оценку работ автоматизируют в 48,9% случаев, хотя опрошенные преподаватели считают это самым слабым применением ИИ. [Anthropic, 27.08.2025](https://www.anthropic.com/news/anthropic-education-report-how-educators-use-claude)
6. Российский вуз: ИИ в учебном процессе используют 16% преподавателей (21 164 человека, 87 регионов, май–июнь 2024). Первичный отчёт РАНХиГС не открывал, цифра из пересказа. [kod.ru](https://kod.ru/ai-university)
7. Тексты ИИ узнаются. Пять «опытных» аннотаторов (часто пишут с ChatGPT) большинством голосов ошиблись в 1 из 300 статей, опираясь на «ИИ-лексику» и на формальность, оригинальность и ясность. [Russell et al., 2025](https://arxiv.org/abs/2501.15654). Преподаватели без такой практики (89 начинающих, 200 опытных) отличить не смогли и были излишне уверены. [Fleckenstein et al., 2024](https://www.leibniz-ipn.de/en/research/publications/do-teachers-spot-ai-evaluating-the-detectability-of-ai-generated-texts-among-student-essays)
8. Обратная связь вредит в трети случаев: мета-анализ 131 работы, 607 эффектов, d=0,41 в среднем, но более 38% эффектов отрицательные. Решает то, на что смещает внимание разбор, а не тон сам по себе. [Kluger & DeNisi 1996](https://cris.huji.ac.il/en/publications/feedback-interventions-toward-the-understanding-of-a-double-edged/)
9. Хвалить личность («вы отличный аналитик») слабо помогает учиться. Работают уровни задачи, процесса и саморегуляции. [Hattie & Timperley 2007](https://www.bera.ac.uk/blog/how-to-optimise-the-use-of-hattie-and-timperleys-feedback-levels-for-student-learning)
10. В РФ принят 243-ФЗ от 26.07.2026. Маркировка ИИ-контента добровольная для авторов, касается аудио и видео, источники расходятся по датам вступления в силу. Справка docs/legal/ai-in-education.md этого не отражает, подробности в разделе 7. [КонсультантПлюс](https://www.consultant.ru/law/hotdocs/95007.html), [Референт](https://referent.cntd.ru/news/read/pervyi-zakon-ob-ii-v-rossii-vstupit-v-silu-poetapno-cto-izmenit-243-fz/novosti-federalnogo-zakonodatelstva)

## 1. Как преподаватели и авторы используют ИИ-генерацию материалов

Ответ: массово для проектирования и подготовки материалов, оценку чаще делегируют, чем стоило бы. Данных о том, что именно правят руками, нет ни в одном найденном источнике.

- ~74 000 анонимизированных диалогов преподавателей вузов с Claude (май–июнь 2025) плюс 22 интервью. Разработка курсов и материалов: 57%. Оценка работ: 7% диалогов, из них 48,9% с автоматизацией. Преподаватели назвали оценку самым слабым применением ИИ. [Anthropic, 27.08.2025](https://www.anthropic.com/news/anthropic-education-report-how-educators-use-claude) ПЕРВ. Выборка: пользователи Claude, не репрезентативна.
- США, вузы, вводные курсы: еженедельно ИИ используют 30% преподавателей и 42% студентов; 3300+ респондентов из 900+ вузов. У тех, кто пользуется ежедневно, 36% отмечают снижение нагрузки. [Tyton, Time for Class 2025](https://tytonpartners.com/time-for-class-2025/) ПЕРВ (30%); размер выборки и 36% из СНИП. Выпуск 2026 (15.06.2026) вышел, разбивки по задачам не получил: [пресс-релиз](https://www.onenewspage.com/n/Press+Releases/1ztfzbmbk5/Tyton-Partners-Releases-2026-Time-for-Class-Report.htm) СНИП.
- Великобритания: 24% преподавателей вузов используют ИИ в преподавании; обучение по ИИ прошли 18%. [Times Higher Education о Jisc](https://timeshighereducation.com/cn/news/one-four-uk-lecturers-now-using-ai-tools-teaching) СНИП. Размеры выборок в результатах поиска смешаны между двумя волнами опроса, не цитировать.
- L&D в мире: больше половины респондентов активно используют ИИ, главное применение: производство учебного контента. [Donald Taylor, Global Sentiment Survey 2025](https://donaldhtaylor.co.uk/?p=37034) СНИП.
- РФ, преподаватели вузов: 16% используют ИИ в учебном процессе (РАНХиГС ИСАП, 21 164 человека, 87 регионов, май–июнь 2024). Информирован, но не применяет: 33%. По дисциплинам: информатика 34%, гуманитарные и экономические 19–20%. [kod.ru, 07.10.2024](https://kod.ru/ai-university) ВТОР, отчёт РАНХиГС не открывал.
- РФ, школы (ВШЭ Институт образования с СберОбразованием, 758 учителей и администраторов, 45 регионов): опыт использования ИИ у 75,5%, регулярно у 18%. Задачи: идеи уроков 37,1%, планы уроков 26,9%, индивидуальные задания 26,7%. [Skillbox](https://skillbox.ru/media/education/kak-rossiyskie-uchitelya-i-prepodavateli-vuzov-ispolzuyut-ii/) ВТОР, дата опроса не указана.
- РФ, вузы (Томский госуниверситет, 464 из 2000+ преподавателей, прошедших курс по ИИ): поддержка внедрения ИИ выросла с 21,5% до 48,7% после обучения. Барьеры: нехватка времени 54,7%, этика 46,6%, ресурсы 43,8%. Там же, ВТОР.

## 2. Что раздражает в текстах ИИ

Ответ: распознаваемость высокая у людей, которые сами пишут с ИИ, и низкая у преподавателей без такой практики. Автоматические детекторы ненадёжны. Списки русских «штампов» есть только в публицистике.

- 5 «экспертов» (частые пользователи LLM) по большинству голосов ошиблись в 1 из 300 англоязычных статей. Опираются на «ИИ-лексику» и на формальность, оригинальность, ясность; переживают перефразирование и «очеловечивание». [Russell, Karpinska, Iyyer, 2025](https://arxiv.org/abs/2501.15654) ПЕРВ.
- Преподаватели (89 начинающих, 200 опытных) не отличили тексты ChatGPT от школьных эссе, были излишне уверены; опытные чуть точнее. [Fleckenstein et al., Computers & Education: AI, июнь 2024](https://www.leibniz-ipn.de/en/research/publications/do-teachers-spot-ai-evaluating-the-detectability-of-ai-generated-texts-among-student-essays) ПЕРВ.
- Маркерные слова: избыточные «стилевые» слова в 15 млн аннотаций PubMed, не менее 13,5% аннотаций 2024 года обработаны LLM (до 40% в части подкорпусов). [Kobak et al., Science Advances, 02.07.2025](https://arxiv.org/abs/2406.07016v5) ПЕРВ. Работа про английский, русского списка из исследования нет.
- Детекторы ошибаются на неносителях: 61,22% эссе TOEFL признаны ИИ. [Liang et al., Patterns 2023](https://scale.stanford.edu/publications/gpt-detectors-are-biased-against-non-native-english-writers) СНИП/ВТОР.
- Студенты читают ИИ-разбор как обезличенный: 25 студентов, 5 британских вузов, фокус-группы (март–май 2025). [Rose et al. 2026, пересказ](https://www.studentvoice.ai/blog/students-find-ai-feedback-useful-but-not-personal-enough-to-trust/) ВТОР; авторы сами оговаривают малую самоотобранную выборку. Опрос 6 960 студентов четырёх австралийских вузов: преподавательскому разбору доверяют 90,5%, ИИ-разбору 60,1%; падение «подлинности» после раскрытия источника. [FE News](https://www.fenews.co.uk/exclusive/ai-or-teacher-feedback-what-do-students-think/) СНИП; цифры не верифицировал по первоисточнику.
- Русские маркеры (одинаковая длина предложений, тире, конструкция «не А, а Б», «эксперты считают» без источника, «важный/ключевой»): [vc.ru](https://vc.ru/id2908863/2796482-kak-raspoznat-teksty-ii) СНИП, не исследование, мнение авторов.
- Редполитики Т-Банка, Яндекса, Практикума про ИИ-тексты и «голос бренда»: публичных документов не нашёл.

## 3. Как L&D задают tone of voice

Ответ: публичных гайдов ВТБ, Сбера, Яндекса для обучающего контента не нашёл. Есть общая практика и рекомендации.

- Рекомендация для L&D: описать персону («дружелюбный специалист», «наставник»), единую для электронных курсов, очного обучения и материалов, независимо от подрядчика. [Learning Guild](https://www.learningguild.com/pivot-tone-and-its-role-in-training-effectiveness/) СНИП (страница при проверке отдала 404).
- Типовое содержание гайда: тон, предпочитаемые термины, запрещённые выражения, длина предложений. [FasterCapital](https://fastercapital.com/term/brand%20voice%20guidelines.html) СНИП, слабый источник.
- Сбер: простой язык, обращение на «вы», нейтральный тон, только по пересказу блогов (sostav.ru), не по документу Сбера. СНИП, низкая уверенность.

## 4. Поля настроек у ИИ-инструментов

Ответ: тон и язык настраивают часто, строгость нигде. Пометки: ПЕРВ = страница вендора, СНИП = сниппет.

- Coassemble, «Brand voice»: Primary voice, Default language, 5 ползунков (Friendly/Professional, Casual/Formal, Conversational/Authoritative, Playful/Serious, Creative/Straightforward), Writing perspective, Sentence length, Preferred terminology, Terms to avoid, «Sounds like us» (образец), стиль изображений. Включается на каждую генерацию. [Coassemble](https://coassemble.com/resources/the-model-that-builds/brand-voice) ПЕРВ. Отдельно «Tone» курса: Informal & Conversational, Academic & Research-Based, Motivational & Persuasive. СНИП.
- CreateUpon (бывший Courseau): поле Tone of Voice; 7 пресетов (friendly and informational, casual and conversational, enthusiastic and motivational, empathetic and supportive, technical and detailed, creative and imaginative, urgent and persuasive) и свои пресеты. [CreateUpon](https://docs.createupon.ai/en/articles/10494076-tone-of-voice-presets) ПЕРВ.
- Microsoft Teams (Copilot), ИИ-разбор: тон Basic / Instructional / Coaching; класс (сложность языка); язык (16 локалей); критерии рубрики. [Microsoft](https://support.microsoft.com/en-us/teams/education/ai-feedback-for-educators) ПЕРВ.
- Curipod: рубрика (своя только на платных тарифах), язык ответа, повторная попытка. Настройки тона нет. [Curipod](https://help.curipod.com/en/articles/739595-can-i-adjust-the-feedback-in-an-ai-feedback-activity) ПЕРВ.
- Brisk: режимы разбора Targeted, Glow & Grow, Rubric Criteria, Next Steps; привязка к рубрике и стандартам; многоязычность (20+ или 50+, страницы расходятся). [Brisk](https://www.briskteaching.com/ai-tool/give-feedback) ПЕРВ (рубрики, языки), режимы СНИП. Настройку тона на странице не нашёл.
- Eduaide Feedback Bot: Typographic, Syntactical, Semantic, Custom (своя рубрика). [AVID](https://avidopenaccess.org/resource/241-eduaide-an-ai-teaching-assistant) СНИП.
- Khanmigo (настройки учеников): уровень чтения Simple / Standard / Professional и язык по умолчанию. [Khan Academy](https://support.khanacademy.org/hc/vi/articles/20080075470477) СНИП. Тон и строгость не нашёл.
- MagicSchool: в инструменте писем поля Purpose, Key Points, Tone; сохраняемые свои промпты и свои чат-боты. [Piedmont USD](https://www.piedmont.k12.ca.us/default-tech/~board/technology-news/post/magiscschoolai-available-through-24-25-for-all-staff) СНИП. Справка вендора про «custom instructions» не раскрылась.
- iSpring Suite AI (блог, 09.2026): правка тона текста, сократить/расширить; параметры генерации курса: аудитория и стиль письма. [iSpring](https://www.ispringsolutions.com/blog/ispring-suite-ai-updates) ПЕРВ, но поля не перечислены.
- Unicraft (28.09.2026): ведущий, фон и голос видео, загрузка брендбука. Тон, строгость, длину не нашёл. [Spark.ru](https://spark.ru/user/268063/blog/393354/unicraft-obnovil-ii-metodista-novie-vozmozhnosti-dlya-sozdaniya-kursov) ВТОР.
- Synthesia: Brand Kit (только Enterprise): стили текста, аватары, цвета, логотип; про тон сценария не нашёл. [Synthesia](https://help.synthesia.io/en/articles/9046610-how-can-i-create-a-synthesia-brand-kit) СНИП.
- ChatGPT (для сравнения): «Base style and tone» (Default, Professional, Friendly, Candid, Quirky, Efficient, Cynical) и характеристики Warm, Enthusiastic, Headers & Lists, Emoji (больше/меньше/по умолчанию). [TechRadar](https://www.techradar.com/ai-platforms-assistants/chatgpt/chatgpts-new-personality-settings-let-you-pick-the-vibe-and-it-ranges-from-corporate-calm-to-chaotic-bestie) ВТОР. Справка OpenAI отдала 403.

## 5. Используют ли настройки на деле

Ответ: по ИИ-продуктам данных нет.

- Исследование 1996 года: 92% участников кастомизировали текстовый редактор, чем больше пользуешься, тем больше настраиваешь. [Page et al., CHI 1996](https://chi1996.acm.org/proceedings/papers/Page/srp_txt.html) ПЕРВ (92% из пересказа абстракта).
- Противоположное утверждение: «более 95% не меняли настройки по умолчанию», меняли чаще всего программисты и дизайнеры. [UIE, 2011](https://archive.uie.com/brainsparks/2011/09/14/do-users-change-their-settings/) ВТОР, метод не раскрыт. Два источника противоречат друг другу, оба до эры ИИ.
- OpenAI: в корпоративных аккаунтах ~20% сообщений идут через Custom GPT или Projects; custom instructions чаще используют продвинутые пользователи. [OpenAI](https://cdn.openai.com/pdf/3c7f7e1b-36c4-446b-916c-11183e4266b7/chatgpt-usage-and-adoption-patterns-at-work.pdf) СНИП (PDF не открыл), доли именно по custom instructions нет.

## 6. Эффект тона обратной связи на взрослых

Ответ: прямых экспериментов «строгий против тёплого» на взрослых с ИИ-разбором не нашёл. Надёжное: содержание разбора важнее тона; хвалить личность бесполезно; около трети вмешательств вредят.

- Kluger & DeNisi 1996: 131 работа, 607 эффектов, 12 652 участника. Средний d=0,41, но более трети эффектов отрицательные. Разбор, смещающий внимание на «я» (личность), вредит. [HUJI](https://cris.huji.ac.il/en/publications/feedback-interventions-toward-the-understanding-of-a-double-edged/) ПЕРВ (абстракт).
- Hattie & Timperley 2007 (Review of Educational Research 77(1)): четыре уровня: задача, процесс, саморегуляция, личность; последний наименее эффективен. [BERA](https://www.bera.ac.uk/blog/how-to-optimise-the-use-of-hattie-and-timperleys-feedback-levels-for-student-learning) ВТОР.
- Wisniewski, Zierer, Hattie 2020: 435 исследований, 994 эффекта, 61 000+ участников, d=0,48; влияние сильно зависит от информационного содержания разбора. [Frontiers in Psychology](https://www.gbl.uzh.ch/quartz/references/Wisniewski-et-al.-(2020)) СНИП.
- Winstone, Nash, Parker, Rowntree 2017: систематический обзор 195 публикаций (1985–2014), таксономия «приёма» обратной связи; эмоциональные реакции и защитность: типичный барьер. [Aston](https://publications.aston.ac.uk/id/eprint/28395) ПЕРВ (карточка), выводы про аффект по СНИП.
- Yeager et al. 2014: «мудрый фидбек» («у меня высокие ожидания, и я знаю, что вы их достигнете») повысил долю тех, кто доработал эссе. Это подростки, не взрослые. [JEP: General](https://diversifyingecon.org/wise-feedback/) ВТОР.
- ИИ-разбор: РКИ, 395 участников, ИИ-разбор с мотивирующими элементами (похвала, эмодзи, ободряющий тон) против нейтрального. Результаты не открыл, страница отдала 403. [Computers & Education 239, 2025](https://dl.acm.org/doi/10.1016/j.compedu.2025.105363) СНИП. Нужно прочитать самому.

## 7. РФ: требования, влияющие на «запретные темы» и язык

Ответ: профильного закона про ИИ в образовании нет, но в docs/legal/ai-in-education.md есть устаревшее место. Школьное письмо Минпросвещения уже разобрано там.

- Закон 243-ФЗ «О поддержке развития технологий ИИ» подписан 26.07.2026. Маркировка: информационных материалов в аудио- и видеоформе, созданных большими фундаментальными моделями; для авторов добровольная, площадки с 500 000+ посетителей в сутки обязаны дать инструмент. Правительство вправе определить случаи, когда допустимы только суверенные или национальные модели. [КонсультантПлюс](https://www.consultant.ru/law/hotdocs/95007.html), [Референт](https://referent.cntd.ru/news/read/pervyi-zakon-ob-ii-v-rossii-vstupit-v-silu-poetapno-cto-izmenit-243-fz/novosti-federalnogo-zakonodatelstva), [Е1](https://www.e1.ru/text/politics/2026/07/30/76559963/) ВТОР (текст закона не открывал). Сроки расходятся: КонсультантПлюс и Референт: 1 сентября 2026 с отдельными нормами 1 марта 2027 (маркировка, обязанности разработчиков); Е1: основные нормы с 1 марта 2027. Образования закон, по Референту, не касается. Для обычных пользователей, по Е1, «ничего не меняется».
- Расхождение с нашей справкой: docs/legal/ai-in-education.md пишет, что нормы о маркировке в РФ не найдено. Теперь она есть (243-ФЗ), и дата «1 марта 2027» частично подтверждается. Нужна сверка с текстом закона (передать compliance).
- 168-ФЗ от 24.06.2025 (с 1 марта 2026): информация для потребителей на русском; Роспотребнадзор подтвердил, что это касается сайтов; исключения: фирменные наименования, товарные знаки. [ComNews, 28.02.2026](https://www.comnews.ru/content/244017/2026-02-28/2026-w09/1010/rospotrebnadzor-zakon-o-zaschite-russkogo-yazyka-kasaetsya-saytov-internete) ВТОР. Относится ли это к тексту курса и интерфейсу образовательного сервиса, не проверено. Важно для настройки «язык».
- «Запретные темы»: перечня обязательных ограничений для образовательного ИИ не нашёл. Е1 упоминает, что господдержка доступна моделям, соответствующим законодательству и «традиционным ценностям» (ВТОР).

## Что не нашёл

- Долю авторов, правящих ИИ-черновики руками, и что именно правят: нет ни в одном источнике.
- Данные по настройкам ИИ-продуктов: доля пользователей, меняющих дефолты.
- Публичные гайды по тону для обучающего контента у ВТБ, Сбера, Яндекса, Т-Банка, Практикума.
- Настройки тона и строгости у 360Learning, Docebo, Sana, Teachbase, Coursera Course Builder, Mitti, Eduaide и MagicSchool (справка вендора не открылась).
- Контролируемые исследования тона (строгий, тёплый, нейтральный) на взрослых специалистах 25–40 с ИИ-разбором. Единственный найденный РКИ (395 человек) не прочитан.
- Первичные отчёты РАНХиГС, ВШЭ, Jisc, EDUCAUSE (платный доступ), Gallup-Walton (PDF не открыл).
- Текст 243-ФЗ и письма Минпросвещения (нужна сверка).
- Русский список ИИ-маркеров из исследования.
- Сегменты: данных отдельно по методистам и корпоративным тренерам нет, всё усреднено по «преподавателям» и «L&D».
