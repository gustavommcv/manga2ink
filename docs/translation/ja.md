# Japanese: the words and the rules

The vocabulary and the style the app's Japanese is written by ([ADR 0084](../adr/0084-the-app-is-also-in-japanese-written-to-read-naturally-and-open-to-correction.md)). A message that disagrees with this page is a mistake in the message or in the page: say which, and change it.

The app's Japanese is written with the help of AI and has not yet been read by many people who speak the language. Corrections are welcome as an [issue](https://github.com/gustavommcv/mangabound/issues) or a pull request. A term that changes is changed here in the same pull request that changes its uses, and the guide's Japanese pages follow it.

Where KOReader has a Japanese word for something the readers meet there, this page takes it unless the note says otherwise. Where the guide has a word, this page keeps it.

## Style

- **Register.** Sentences are in the polite form (です・ます) and end with 。. The text of a button, a tab, a heading, a menu item and a field is a noun phrase or the dictionary form of a verb, with no 。. A button that is the action itself is the noun (保存, 削除, 共有); one that has an object names it (フォルダーを選択…).
- **Natural, not word for word.** Rewrite the sentence as a Japanese application would say it. Leave out "you" and "your" (あなた, お使いの) unless the sentence is unclear without them.
- **A failure** says what happened and what can be done, plainly: 「〜できませんでした。」 No apology, no exclamation mark.
- **Punctuation.** Full-width parentheses （） and quotation marks 「」 (the name of a control in a sentence is in 「」), 、 and 。, and a single … where the English has one for a control that asks for more. Digits, Latin letters and symbols are half-width.
- **Colons.** A half-width colon and a space, as the guide writes it (最初: Ch.1).
- **Spaces.** One space between Latin letters or digits and the Japanese text next to them, as the guide writes it (Mangabound は, 3 冊). A number and its unit in Latin letters keep their space (12 GB), as `Intl` writes them. A value the app puts into a sentence has a space beside it only where it is always in Latin letters (a language tag, the name of a service, a file extension): a name that a person chose is put in without one, since the app cannot know how it is written.
- **A name in a sentence** is in 「」 where the place always holds a name (a book, a folder, an option): 「Berserk」を選択. Where the place can also hold a phrase of the catalog (the heading of a run that says 「お使いの本」 when it has no name to give), there are no marks, so the phrase does not look like a title.
- **The long vowel mark** is kept where the platforms keep it: フォルダー, ユーザー, サーバー, エディター. A word the guide already writes without it keeps that (ライブラリ).
- **Kana and kanji.** Everyday words in kanji (余白, 見開き, 表紙), loanwords that readers already use in katakana (キュー, カラー, ガンマ). Only common kanji; no furigana.
- **Numbers, dates, sizes and lists** come from `Intl` for Japanese, not from the catalog, and a list the catalog joins itself (the names of folders) is joined with 、.
- **Sentences the window puts together** (two notes one after the other, a name and the end of the sentence) follow `sentenceMarks` in `src/i18n/sentence-marks.ts`: nothing between two sentences, and 。 to end one.
- **Line breaks.** A line of Japanese may break between any two characters, so `styles.css` asks for breaks between phrases and keeps a small kana or a closing mark from starting a line (`:lang(ja)`). A text is not edited to fit a width.

### Counters

There is no plural, so a count is written with the counter of what is counted, with the same text for one and for many: `countOf` gets the same text for both forms.

| Counted                                | Counter | Example    |
| -------------------------------------- | ------- | ---------- |
| books                                  | 冊      | 3 冊       |
| volumes                                | 巻      | 3 巻       |
| chapters                               | 話      | 12 話      |
| pages                                  | ページ  | 200 ページ |
| files, folders, items                  | 個      | 4 個       |
| conversions, failures, warnings, notes | 件      | 2 件       |

### What stays in Latin letters

The name of the app, of the tools and of the services it works with (Mangabound, KOReader, Kindle, Kobo, reMarkable, MangaDex), the names of formats and standards (EPUB, CBZ, PDF, PNG, JPEG, OPDS, ComicInfo.xml), and what a person typed or a folder or a file is called. The report of diagnostics, the log and the name of the catalog served to an e-reader stay in English in every language.

## The things the app handles

| English              | 日本語           | Note                                                                                                                    |
| -------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| manga                | マンガ           | Katakana, as the guide writes it.                                                                                       |
| chapter              | 話               | One installment of a story: 12 話. The chapters as a list or a heading: 各話. Not チャプター, not 章 (a book's).        |
| volume               | 巻               | 3 巻. The number of a volume: 巻番号.                                                                                   |
| book                 | 本               | The file the app makes; counted with 冊. 書籍 is the formal word and is not needed.                                     |
| series               | シリーズ         |                                                                                                                         |
| page                 | ページ           |                                                                                                                         |
| cover                | 表紙             | Not カバー, which is the jacket.                                                                                        |
| double-page spread   | 見開き           | "Double-page spreads": 見開きページ.                                                                                    |
| panel                | コマ             | A frame of a page. Not パネル. Between two panels: コマ間.                                                              |
| title                | タイトル         | Not 題名. Of a series: シリーズのタイトル; of a book: 本のタイトル.                                                     |
| author               | 著者             | The word of a book's data. Not 作者.                                                                                    |
| language (of a book) | 言語             |                                                                                                                         |
| metadata             | メタデータ       |                                                                                                                         |
| e-reader             | 電子書籍リーダー | リーダー where the line is short.                                                                                       |
| device               | 端末             | A Kindle, a Kobo. The word Kindle's pages use; KOReader's デバイス is for any device. Device profile: 端末プロファイル. |
| webtoon              | ウェブトゥーン   |                                                                                                                         |
| library              | ライブラリ       | A folder of series the app lists.                                                                                       |
| folder               | フォルダー       |                                                                                                                         |
| file                 | ファイル         |                                                                                                                         |

## Working through the queue

| English                       | 日本語                               | Note                                                                                 |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| queue                         | キュー                               | What is to be converted. A queued item: キューの項目.                                |
| group chapters into volumes   | 各話を巻にまとめる                   | The guide's words for the first step. While it runs ("Binding"): まとめ中.           |
| convert, conversion           | 変換                                 | Converting: 変換中. "Convert for e-reader": リーダー向けに変換.                      |
| chapter mapping               | 各話と巻の割り当て                   | 割り当て alone where it is clear. Not マッピング.                                    |
| assign, assigned, unassigned  | 割り当てる、割り当て済み、未割り当て |                                                                                      |
| split (a volume)              | 分割                                 |                                                                                      |
| plan                          | 計画                                 | What the app shows before it writes anything. "Validate plan": 計画を検証.           |
| ready check                   | 確定前のチェック                     | The errors and warnings listed before a mapping is confirmed.                        |
| confirm (a mapping)           | 確定                                 | A choice that is settled. 確認 is "check".                                           |
| waiting, converting, complete | 待機中、変換中、完了                 | Saving: 保存中.                                                                      |
| pending book                  | 保留中の本                           | A finished book that is not saved yet; the guide's words. "Earlier books": 以前の本. |
| working folder                | 作業フォルダー                       |                                                                                      |
| free space                    | 空き容量                             |                                                                                      |
| single book                   | 1 冊にまとめる                       | "Create one book for the series": シリーズを 1 冊の本にする.                         |

## Saving, sharing and the small words

| English                  | 日本語                         | Note                                                                           |
| ------------------------ | ------------------------------ | ------------------------------------------------------------------------------ |
| save                     | 保存                           | "Save as…": 名前を付けて保存…. "Save all to folder…": すべてフォルダーに保存…. |
| delete                   | 削除                           | Not 消去.                                                                      |
| cancel                   | キャンセル                     |                                                                                |
| close, dismiss           | 閉じる                         |                                                                                |
| keep                     | 残す                           |                                                                                |
| undo, redo               | 元に戻す、やり直す             |                                                                                |
| reset                    | リセット                       | "Reset to defaults": 初期設定に戻す.                                           |
| clear, clear all         | クリア、すべてクリア           |                                                                                |
| select all               | すべてを選択                   |                                                                                |
| retry                    | 再試行                         |                                                                                |
| copy, copied             | コピー、コピーしました         |                                                                                |
| show, hide details       | 詳細を表示、詳細を隠す         |                                                                                |
| search, matches          | 検索、一致                     | "No matches": 一致なし.                                                        |
| share, sharing           | 共有                           | 共有を開始, 共有を停止: the guide's words.                                     |
| catalog                  | カタログ                       | What a reader adds to see the books. OPDS stays as it is.                      |
| address                  | アドレス                       |                                                                                |
| network interface        | ネットワークインターフェース   |                                                                                |
| username, password, port | ユーザー名、パスワード、ポート |                                                                                |

## Telling something

| English                 | 日本語                 | Note                                                                                        |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| warning                 | 警告                   |                                                                                             |
| error                   | エラー                 |                                                                                             |
| failed                  | 失敗                   |                                                                                             |
| fix                     | 修正                   |                                                                                             |
| notice                  | お知らせ               | What the app shows in a strip. 通知 is the notification the system shows when a queue ends. |
| technical details       | 技術的な詳細           |                                                                                             |
| diagnostics             | 診断情報               |                                                                                             |
| log                     | ログ                   |                                                                                             |
| online, offline         | オンライン、オフライン |                                                                                             |
| source (of volume data) | 情報源                 | "Online source": オンラインの情報源. An attribution: 「データ提供: MangaDex」.              |
| manual                  | 手動                   |                                                                                             |
| file names              | ファイル名             |                                                                                             |

## The app

| English                               | 日本語                                       | Note                                                   |
| ------------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| app settings                          | アプリの設定                                 |                                                        |
| interface (tab)                       | インターフェース                             |                                                        |
| processing (tab)                      | 処理                                         |                                                        |
| about (tab)                           | このアプリについて                           |                                                        |
| language                              | 言語                                         |                                                        |
| theme, dark, light                    | テーマ、ダーク、ライト                       | Graphite: グラファイト. Paper: ペーパー.               |
| automatic                             | 自動                                         | "Automatic (system language)": 自動（システムの言語）. |
| updates                               | 更新                                         | "Check for updates": 更新を確認.                       |
| stable, pre-release                   | 安定版、プレリリース版                       |                                                        |
| version                               | バージョン                                   |                                                        |
| user guide                            | ユーザーガイド                               |                                                        |
| release notes                         | リリースノート                               |                                                        |
| report a problem                      | 問題を報告                                   |                                                        |
| support the project                   | プロジェクトを支援する                       |                                                        |
| troubleshooting                       | トラブルシューティング                       |                                                        |
| license, third-party notices, credits | ライセンス、サードパーティの通知、クレジット |                                                        |
| conversion tools                      | 変換ツール                                   | Verified: 検証済み. Bundled: 同梱.                     |
| data folder, logs folder              | データフォルダー、ログフォルダー             |                                                        |

## The conversion options

| English                      | 日本語                         | Note                                                                                                            |
| ---------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| options, basic, advanced     | オプション、基本、詳細設定     |                                                                                                                 |
| profile                      | プロファイル                   |                                                                                                                 |
| format                       | 形式                           | Of a book and of a page image.                                                                                  |
| reading order                | 読み順                         | "Manga reading order": マンガの読み順. 右から左 and 左から右.                                                   |
| page turn                    | ページめくり                   | KOReader's word. Not ページ送り.                                                                                |
| rotate, clockwise            | 回転、時計回り                 |                                                                                                                 |
| wide page                    | 横長のページ                   | The guide's words.                                                                                              |
| fit, enlarge, stretch        | 合わせる、拡大、引き伸ばし     | "Fit, never enlarge": 画面に合わせる（拡大しない）.                                                             |
| borders                      | 縁                             | The bars round a page that does not fill the screen: 縁の色, 自動、白、黒. Not 余白, the page's own white edge. |
| margin                       | 余白                           |                                                                                                                 |
| cropping                     | トリミング                     | KOReader's word. The guide's クロップ becomes this.                                                             |
| preserved margin             | 残す余白                       |                                                                                                                 |
| minimum retained area        | 最低限残す範囲                 |                                                                                                                 |
| inter-panel gap              | コマ間の隙間                   |                                                                                                                 |
| landscape, portrait          | 横向き、縦向き                 | "One page in landscape": 横向きでは 1 ページ表示. "Two-page view": 2 ページ表示.                                |
| grayscale, color             | グレースケール、カラー         |                                                                                                                 |
| tone                         | 階調                           | "Color and tone": カラーと階調.                                                                                 |
| contrast, autocontrast       | コントラスト、自動コントラスト |                                                                                                                 |
| gamma                        | ガンマ                         |                                                                                                                 |
| black point                  | 黒点                           |                                                                                                                 |
| rainbow effect               | レインボー効果                 |                                                                                                                 |
| quality                      | 画質                           | "JPEG quality": JPEG の画質.                                                                                    |
| quiet mode                   | 出力を静かにする               | The guide's words for the option.                                                                               |
| left out (of a run)          | 対象外                         | "3 話が対象外です". Taken out of the queue without deleting anything: キューから外す.                           |
| table of contents, bookmarks | 目次、しおり                   | An EPUB's table of contents is 目次; a PDF's bookmarks are しおり, as Acrobat calls them; a CBZ has folders.    |
| this computer                | このパソコン                   | The computer the app runs on. 端末 is the e-reader.                                                             |
| default (a setting)          | 初期設定                       | "Reset to defaults": 初期設定に戻す. KOReader's デフォルト is not used.                                         |
| process (the queue)          | 処理                           | The button that starts it: 処理, or 3 個の項目を処理.                                                           |

## Adding to this page

A term that is not here is decided when it is translated: look in KOReader's Japanese catalog and in the Japanese guide first, then write the word and the reason in a row, in the same pull request that uses it. Run `npm run format` before pushing, which keeps the tables aligned.
