import type { MessageId } from '@/domain/message';

/**
 * What every code says in Japanese, one text for each form of its row in the other tables, in the same
 * order (ADR 0084). The Japanese was written with the help of AI and is open to correction: a
 * correction is made here and in `src/i18n` together, and `docs/translation/ja.md` says the words.
 */
export const japaneseRows: Readonly<Record<MessageId, readonly string[]>> = {
  'queue.chip.checking': ['確認中…'],
  'queue.chip.unreadable': ['読み込めません'],
  'queue.chip.nothingToJoin': ['まとめる対象なし'],
  'queue.chip.ready': ['準備完了'],
  'queue.chip.oneBook': ['1 冊'],
  'queue.chip.notRecognized': ['認識できません'],
  'queue.chip.needsVolumes': ['巻が必要'],
  'queue.chip.needsGrouping': ['まとめが必要'],
  'queue.chip.reviewVersions': ['版を選択'],
  'queue.chip.wholeSeries': ['シリーズ全体'],
  'queue.chip.saved': ['保存済み'],
  'queue.chip.volumes': ['1 巻', '2 巻'],
  'queue.chip.titles': ['1 タイトル', '3 タイトル'],
  'queue.detail.folderReading': ['フォルダー · 読み込み中'],
  'queue.detail.cbzChecking': ['CBZ · 確認中'],
  'queue.detail.folder': ['フォルダー'],
  'queue.detail.cbz': ['CBZ'],
  'queue.detail.cbzOneVolume': ['CBZ · すでに 1 巻'],
  'queue.detail.cbzStraight': ['CBZ · そのままリーダー向けの手順へ'],
  'queue.detail.folderNoChapters': ['フォルダー · 各話が見つかりません'],
  'queue.detail.folderChapters': [
    'フォルダー · 1 話',
    'フォルダー · 3 話',
    'フォルダー · 3 話 · まとめていません',
    'フォルダー · 3 話 · 名前からまとめ済み',
  ],
  'queue.detail.library': ['ライブラリ · 1 タイトル', 'ライブラリ · 4 タイトル'],
  'queue.detail.libraryVolumes': [
    'ライブラリ · 1 タイトル · 1 巻',
    'ライブラリ · 2 タイトル · 5 巻',
  ],
  'queue.note.noChapters': [
    'mangabind はここで各話を見つけられませんでした。フォルダーを 1 冊の本として変換するには、「各話を巻にまとめる」をオフにしてください。',
  ],
  'queue.note.onlyLinks': [
    'この中のフォルダー 1 個はリンクです。mangabind はシリーズへのリンクをたどらないため、読み込まれませんでした: Berserk。実際のフォルダーをライブラリに置いて、もう一度追加してください。',
    'この中のフォルダー 4 個はリンクです。mangabind はシリーズへのリンクをたどらないため、読み込まれませんでした: Berserk、Vagabond、Monster ほか 1 個。実際のフォルダーをライブラリに置いて、もう一度追加してください。',
  ],
  'queue.note.noVolumesYet': [
    'まだ巻がありません。「本と巻を編集」を開いて各話をまとめるか、シリーズ全体を 1 冊にしてください。',
  ],
  'queue.note.versionsPending': [
    '1 話に複数の版があります。グループ分けの前に、「本と巻を編集」を開いて使う版を選んでください。ファイルはそのままの場所に残ります。',
    '3 話に複数の版があります。グループ分けの前に、「本と巻を編集」を開いて使う版を選んでください。ファイルはそのままの場所に残ります。',
  ],
  'queue.note.unassigned': [
    '1 話が、まだどの巻にも入っていません。「本と巻を編集」を開いて割り当てるか、抜けがあるまま進めることもできます。',
    '2 話が、まだどの巻にも入っていません。「本と巻を編集」を開いて割り当てるか、抜けがあるまま進めることもできます。',
  ],
  'queue.note.stepsNotForSeries': [
    'キューの手順はここでは適用されません。このシリーズは、まとめて変換され、1 冊になります。',
    'キューの手順はここでは適用されません。各タイトルは、まとめて変換され、1 冊になります。',
  ],
  'queue.note.stepsNotForAsIs': [
    'キューの手順はここでは適用されません。このフォルダーは、そのまま変換されるだけです。',
  ],
  'queue.note.chaptersLeftOut': ['1 話が対象外です。', '2 話が対象外です。'],
  'queue.note.libraryEmpty': ['このフォルダーに、mangabind はマンガを見つけられませんでした。'],
  'queue.note.titlesNeedVolumes': [
    '1 タイトルには、まだ巻がありません。この行の鉛筆アイコンから、まとめてください。',
    '2 タイトルには、まだ巻がありません。この行の鉛筆アイコンから、まとめてください。',
  ],
  'queue.note.titlesLeftOut': [
    '1 タイトルは、巻ができるまで対象外です。',
    '2 タイトルは、巻ができるまで対象外です。',
  ],
  'queue.note.titlesFailed': [
    '1 タイトルは前回失敗したため、もう一度実行されます。',
    '2 タイトルは前回失敗したため、もう一度実行されます。',
  ],
  'queue.note.unrecognizedChapters': [
    '名前を各話として読み取れないフォルダーが 1 個あり、本から除外されています: Extras。各話の番号（たとえば Ch.005）を含む名前に変更してから、フォルダーをもう一度追加してください。',
    '名前を各話として読み取れないフォルダーが 5 個あり、本から除外されています: A、B、C ほか 2 個。各話の番号（たとえば Ch.005）を含む名前に変更してから、ライブラリをもう一度追加してください。',
  ],
  'queue.note.unrecognizedInLibrary': [
    '名前を各話として読み取れないフォルダーが 3 個あり、本から除外されています: Berserk（Extras）、Monster（Notes、Bonus）。各話の番号（たとえば Ch.005）を含む名前に変更してから、ライブラリをもう一度追加してください。',
    '名前を各話として読み取れないフォルダーが 7 個あり、本から除外されています: A（1）、B（2）、C（3） ほか 1 タイトル。各話の番号（たとえば Ch.005）を含む名前に変更してから、ライブラリをもう一度追加してください。',
  ],
  'mode.cbzIsOneVolume': ['CBZ はすでに 1 巻なので、まとめる対象がありません。'],
  'mode.chaptersAreArchives': [
    'このフォルダーの各話は CBZ ファイルなので、変換する前に巻にまとめる必要があります。',
  ],
  'mode.libraryGroupsFirst': [
    'ライブラリは、まずタイトルごとに各話が巻にまとめられるため、巻をまとめる手順を省略できません。',
  ],
  'text.raw': ['Not enough space on the disk.'],
  'failure.cancelled': ['キャンセルしました。'],
  'failure.conversionCancelled': ['変換をキャンセルしました。'],
  'failure.internal': ['Manga2Ink はその操作を完了できませんでした。'],
  'failure.invalidRequest': ['Manga2Ink は、無効なリクエストを拒否しました。'],
  'failure.untrustedSender': ['Manga2Ink は、自身のウィンドウからのリクエストだけを受け付けます。'],
  'failure.fileAccessDenied': [
    'Manga2Ink は、必要なファイルまたはフォルダーを使用する許可を得られませんでした。そのフォルダーのアクセス許可を確認して、もう一度お試しください。',
  ],
  'failure.diskFull': [
    'ドライブの空き容量がありません。空き容量を確保して、もう一度お試しください。',
  ],
  'failure.settingsNotSaved': ['設定を保存できませんでした。'],
  'failure.settingsNotLoaded': ['保存された設定を読み込めませんでした。'],
  'failure.suggestionNotApplied': ['提案を適用できませんでした。'],
  'failure.searchNotCompleted': ['検索を完了できませんでした。'],
  'failure.catalogUnreadable': ['出力ライブラリのカタログを読み込めませんでした。'],
  'failure.toolIncompatible': [
    '同梱の変換ツールが、互換性のないデータを返しました。Manga2Ink を再インストールするか、診断情報を開いてください。',
  ],
  'failure.bindingFailed': ['mangabind は、選ばれた巻を作成できませんでした。'],
  'failure.conversionFailed': ['mangaprep は、この巻を変換できませんでした。'],
  'failure.titleNotConverted': ['変換できませんでした。'],
  'failure.coverUnusable': [
    '「Vol.01.epub」に選んだ表紙を使用できませんでした。本の詳細ページで、表紙を削除するか、別の画像を選んでください。',
  ],
  'failure.alreadyRunning': [
    'その検証は、すでに実行中です。',
    'そのライブラリの読み込みは、すでに実行中です。',
    'その検索は、すでに実行中です。',
    'その照会は、すでに実行中です。',
    'その変換は、すでに実行中です。',
  ],
  'failure.conversionNotRunning': ['その変換は、もう実行されていません。'],
  'failure.sourceUnavailable': ['その情報源は利用できません。'],
  'failure.sourceUnsafeAddress': ['その情報源には、安全なアドレスがありません。'],
  'failure.savedBookGone': ['保存された本は、もう利用できません。'],
  'failure.chooseInputAgain': ['入力をもう一度選んでください。'],
  'failure.chooseLibraryAgain': ['共有するライブラリを、もう一度選んでください。'],
  'failure.pendingConversionGone': ['保留中の変換は、もう利用できません。'],
  'failure.pendingConversionBeingDeleted': ['保留中の変換は、削除されているところです。'],
  'failure.pendingStillSaving': [
    '保留中のこの変換を削除する前に、保存が終わるのを待ってください。',
  ],
  'failure.pendingNotFound': [
    'これらの保留中の本は、もう利用できません。Manga2Ink を開き直して、一覧を更新してください。',
  ],
  'failure.pendingUnreadable': [
    '保留中の本を読み込めませんでした。ファイルは削除されていません。保存場所のアクセス許可を確認して、Manga2Ink を再起動してみてください。',
  ],
  'failure.pendingDeleteFailed': [
    '保留中の本を削除できませんでした。保存場所のアクセス許可を確認して、もう一度お試しください。',
  ],
  'failure.pendingNotDeleted': [
    'Manga2Ink は、これらの保留中の本を削除できませんでした。もう一度お試しください。',
  ],
  'failure.readyBooksShared': [
    '完成した本は共有されています。保留中のコピーを削除する前に、共有を停止してください。',
  ],
  'failure.waitForConversion': [
    '保留中の本を削除する前に、実行中の変換が終わるのを待ってください。',
  ],
  'failure.sharingAlreadyRunning': ['共有はすでに実行中です。'],
  'failure.sharingNotRunning': ['共有は実行されていません。'],
  'failure.sharingAddressUnavailable': [
    'このネットワークアドレスは、このパソコンでは利用できません。一覧から選んでください。',
  ],
  'failure.sharingPendingBeingDeleted': [
    'これらの保留中の本は削除されているところで、共有できなくなりました。',
  ],
  'failure.sharingPortInUse': [
    'ポート 8080 は、このパソコンの別のプログラムがすでに使用しています。そのプログラムを閉じて、もう一度お試しください。',
  ],
  'failure.sharingAddressRefused': [
    'そのネットワークアドレスでは、共有サーバーを起動できませんでした。',
  ],
  'failure.processingFolderUnavailable': [
    '作業フォルダー「/mnt/books」を利用できません。ドライブを接続し直すか、アプリの設定で別のフォルダーを選んでください。',
  ],
  'failure.processingFolderUnusable': [
    'Manga2Ink は「/mnt/books」で作業できません。書き込めるフォルダーを選んでください。',
  ],
  'failure.diagnosticsNotCopied': ['診断情報をコピーできませんでした。'],
  'failure.folderNotOpened': [
    'フォルダーを開けませんでした。代わりに、お使いのファイルマネージャーから開いてください。',
  ],
  'failure.processingBusy': [
    '変換または共有が実行中です。終了または停止してから、もう一度お試しください。',
  ],
  'notice.settingsUnreadable': ['保存された設定を読み込めなかったため、初期設定を使用しています。'],
  'notice.optionsReset': [
    '保存されていた一部のオプションを使用できず、初期設定に戻りました: 「ガンマ」。',
    '保存されていた一部のオプションを使用できず、初期設定に戻りました: 「出力を静かにする」、「最低限残す範囲」。',
  ],
  'notice.deviceFallback': [
    '端末プロファイル「KPW5」を利用できないため、「Kindle Paperwhite 6」が選択されています。',
  ],
  'input.unreadable': ['この項目を読み込めませんでした。'],
  'input.onlyFoldersAndCbz': ['追加できるのは、フォルダーと .cbz ファイルだけです。'],
  'input.overLimit': [
    '一度に追加できるのは最初の 100 個までで、1 個は対象外になりました。',
    '一度に追加できるのは最初の 100 個までで、5 個は対象外になりました。',
  ],
  'workflow.inputGone': ['この入力は、もう利用できません。もう一度選んでください。'],
  'workflow.titleGone': [
    'そのタイトルは、ライブラリにありません。ライブラリを選び直してください。',
  ],
  'workflow.notALibrary': ['この入力はライブラリではありません。'],
  'workflow.libraryNeedsTitle': [
    'ライブラリはタイトルの集まりです。そのうちの 1 つを選んでください。',
  ],
  'workflow.libraryByTitle': [
    'ライブラリはタイトルごとに変換され、1 つの入力としては変換されません。',
  ],
  'workflow.detailsNeedFolder': [
    '著者と言語はフォルダーに保存されますが、この入力はフォルダーではありません。',
  ],
  'workflow.mappingInvalid': ['各話と巻の割り当てに、不明または不正な割り当てが含まれています。'],
  'workflow.mappingErrors': ['変換する前に、各話と巻の割り当てのエラーを修正してください。'],
  'workflow.versionsPending': [
    '1 話に複数の版があります。変換する前に、使う版を選んでください。',
    '3 話に複数の版があります。変換する前に、使う版を選んでください。',
  ],
  'workflow.mappingNotSaved': [
    '元のフォルダーに mangabind.json を保存できませんでした。フォルダーに書き込めることと、mangabind.json が正しい JSON であることを確認してください。',
  ],
  'workflow.detailsNotSaved': [
    '元のフォルダーに、著者と言語を保存できませんでした。フォルダーに書き込めることと、mangabind.json が正しいことを確認してください。',
  ],
  'workflow.confirmMapping': [
    '変換する前に、各話と巻の割り当てを確定してください。',
    '計画を検証する前に、各話と巻の割り当てを確定してください。',
  ],
  'workflow.reviewSettings': [
    '変換する前に、出力設定を確認してください。',
    '計画を検証する前に、出力設定を確認してください。',
  ],
  'workflow.singleBookNeedsBoth': [
    '1 冊にまとめるモードでは、巻にまとめる手順と変換する手順の両方が必要です。',
  ],
  'workflow.noVolumes': [
    '巻のファイルが作られませんでした。各話と巻の割り当てを確認して、もう一度お試しください。',
  ],
  'workflow.publishFailed': [
    '完成した本を、Manga2Ink の保留用の保存場所に書き込めませんでした。空き容量と、保存場所へのアクセス許可を確認してください。',
  ],
  'save.bookGone': ['この保留中の本は、もう利用できません。'],
  'save.bookBeingDeleted': ['この保留中の本は、削除されているところです。'],
  'save.wrongExtension': ['この本には、.epub ファイルを選んでください。'],
  'save.nameUnavailable': ['使用できるファイル名が見つかりませんでした。'],
  'save.destinationFull': [
    '保存先がいっぱいです。空き容量を確保してから、もう一度お試しください。保留中の本は無事です。',
  ],
  'save.cannotWrite': [
    'Manga2Ink はその保存先に書き込めません。書き込み可能なフォルダーを選ぶか、フォルダーのアクセス許可を確認してください。',
  ],
  'save.folderGone': [
    '選んだ保存先のフォルダーは、もう利用できません。別のフォルダーを選んでください。',
  ],
  'save.failed': [
    '本を保存できませんでした。保留中のコピーは残っています。別の保存先をお試しください。',
  ],
  'save.copiedCatalogFailed': [
    '本はコピーされましたが、保存先のカタログを更新できませんでした。別のフォルダーを選ぶか、フォルダーのアクセス許可を確認してから、もう一度お試しください。保留中のコピーは無事です。',
  ],
  'save.copiedNotRecorded': [
    '本はコピーされましたが、Manga2Ink は保存済みであることを記録できませんでした。保留中のコピーは残っているので、もう一度お試しいただけます。',
  ],
  'provider.catalogue': ['マンガのコミュニティカタログ（巻と話のデータ付き）'],
  'provider.timeout': [
    'MangaDex から時間内に応答がありませんでした。しばらくしてから、もう一度お試しください。',
  ],
  'provider.unreachable': ['MangaDex に接続できませんでした。'],
  'provider.rateLimited': [
    'MangaDex がリクエストを制限しています。しばらくしてから、もう一度お試しください。',
  ],
  'provider.unexpectedStatus': ['MangaDex が予期しないステータス（503）を返しました。'],
  'provider.malformedJson': ['MangaDex が不正な形式の JSON を返しました。'],
  'provider.unexpectedSearch': ['MangaDex が予期しない検索結果を返しました。'],
  'provider.unexpectedVolumes': ['MangaDex が予期しない巻の情報を返しました。'],
  'provider.unexpectedReleases': ['GitHub が予期しないバージョンの一覧を返しました。'],
  'mapping.invalidVolumeNumber': ['巻番号が正しくありません: abc'],
  'mapping.chapterNotMappable': [
    '「Afterword」には、mangabind が割り当てられる話の番号がありません。',
  ],
  'mapping.chapterBadSpecial': ['「Ch.2 extra」には、対応していない特別話の接尾辞が付いています。'],
  'mapping.unknownChapter': ['不明な話: c9'],
  'mapping.unknownVolume': ['不明な巻: v9'],
  'mapping.unknownVersionGroup': ['不明な複数版の話: 6'],
  'mapping.unknownVersion': ['その話に存在しない版です: b.cbz'],
  'mapping.duplicateChapterId': ['話の ID が重複しています: c1'],
  'mapping.duplicateVolumeId': ['巻の ID が重複しています: v1'],
  'mapping.chooseOneChapter': ['少なくとも 1 つの話を選んでください。'],
  'mapping.splitLeavesNone': ['分割したあとも、各巻に少なくとも 1 つの話が残る必要があります。'],
  'mapping.chooseTwoVolumes': ['統合する巻を、異なる 2 つ選んでください。'],
  'mapping.hasErrors': ['各話と巻の割り当てにエラーがあります。保存する前に修正してください。'],
  'mapping.issue.invalidSource': ['提案された割り当てには、提供元と作品の両方が必要です。'],
  'mapping.issue.emptyVolume': ['3 巻に話がありません。'],
  'mapping.issue.unparseable': ['「Afterword」は mangabind.json で表せません。'],
  'mapping.issue.filenameConflict': [
    '「Vol.2 Ch.5」は 2 巻を示しているため、mangabind は 1 巻ではなく 2 巻に入れます。',
  ],
  'mapping.issue.duplicateVolume': ['巻番号 2 が複数の巻に付いています。'],
  'mapping.issue.duplicateSources': ['2 話を表す元が複数あり、mangabind はどれかを選べません。'],
  'mapping.issue.copiesInFolder': [
    '2 話がフォルダーに複数あります。mangabind はどのコピーを使うか選べず、すべてを本から除外します。1 つを残して、ほかをフォルダーから取り除いてください。',
  ],
  'mapping.issue.unassigned': [
    '1 話が、どの巻にも割り当てられていません。',
    '3 話が、どの巻にも割り当てられていません。',
  ],
  'library.links.title': [
    'このライブラリの 1 個のフォルダーが読み込まれませんでした',
    'このライブラリの 3 個のフォルダーが読み込まれませんでした',
  ],
  'library.links.advice': [
    'これらはリンクで、mangabind はシリーズへのリンクをたどりません。実際のフォルダーをライブラリに置くか、それぞれを個別に追加してください:',
    'これらはリンクで、mangabind はシリーズへのリンクをたどりません。実際のフォルダーをライブラリに置くか、それぞれを個別に追加してください:',
  ],
  'library.links.names': ['Berserk', 'A、B、C', 'A、B、C ほか 2 個'],
  'covers.typesSentence': ['表紙にできるのは、JPEG、PNG、WebP、GIF、BMP の画像です。'],
  'covers.unreadableFile': ['そのファイルを画像として読み込めなかったため、使われませんでした。'],
  'covers.noImageFound': ['そこには画像が見つかりませんでした。'],
  'covers.kept': [
    '1 冊の本は、選んだ表紙をそのまま使います。',
    '2 冊の本は、選んだ表紙をそのまま使います。',
  ],
  'covers.imagesUnreadable': [
    '1 個の画像を読み込めませんでした（02.jpg）。その画像が当たる本は、最初のページを表紙のままにします。',
    '5 個の画像を読み込めませんでした（a.jpg、b.jpg、c.jpg ほか 2 個）。その画像が当たる本は、最初のページを表紙のままにします。',
  ],
  'covers.unused': [
    '1 個の画像は使われませんでした。本は 1 冊です。',
    '2 個の画像は使われませんでした。本は 3 冊です。',
  ],
  'covers.fewImages': [
    '本 3 冊に対して画像は 1 個でした。ほかの本は変わりません。',
    '本 5 冊に対して画像は 3 個でした。ほかの本は変わりません。',
  ],
  'options.lock.webtoon': ['ウェブトゥーンのストリップでは使われません。'],
  'options.lock.strips': ['ストリップの並べ直しに置き換えられます。'],
  'options.lock.untouched': ['画像をそのまま使う間は、使われません。'],
  'options.lock.pngOnly': ['PNG のページにのみ適用されます。'],
  'options.lock.epubOnly': ['EPUB だけが持つ設定です。'],
  'options.lock.bordersWebtoon': ['ウェブトゥーンのストリップでは、常に白です。'],
  'options.lock.bothVersions': ['分割したページと全体の両方を作るときだけ使われます。'],
  'options.lock.wholeSpreadKept': ['見開き全体を残すときだけ使われます。'],
  'options.lock.spreadUpright': ['見開き全体を立てたままにする間は、何も回転されません。'],
  'options.lock.noJpeg': ['JPEG として保存されるものがありません。'],
  'options.lock.alreadyEightBit': ['256 階調のグレーをすべて保持する間は、すでに 8 ビットです。'],
  'options.lock.alwaysEightBitPdf': ['PDF では、常に 8 ビットです。'],
  'options.lock.colorKept': ['カラーのページをカラーのまま残すときだけ使われます。'],
  'options.lock.pdfNoCover': ['PDF には表紙がありません。'],
  'options.lock.cbzCoverCut': ['CBZ に表紙が付くのは、横長の画像から切り出したときだけです。'],
  'options.lock.koboEpub': ['Kobo 向けの EPUB にのみ適用されます。'],
  'options.lock.customNamesEpub': [
    'サイズを指定している場合は、すでに本の名前が .epub になります。',
  ],
  'options.issue.chooseDevice': ['端末プロファイルを選択してください。'],
  'options.issue.customSizeBoth': ['端末サイズを指定する場合は、幅と高さの両方が必要です。'],
  'options.issue.languageCode': ['EPUB の言語コードを入力してください。'],
  'options.issue.number': [
    '「ガンマ」は、0.1 から 4 までの数値にしてください。',
    '「トリミングの強さ」は、0 から 10 までの数値にしてください。',
  ],
  'options.issue.percent': [
    '「最低限残す範囲」は、0 から 100 の間にしてください。',
    '「残す余白」は、0 から 100 の間にしてください。',
  ],
  'options.issue.whole': [
    '「JPEG の画質」は、1 から 100 までの整数にしてください。',
    '「幅の指定」は、1 から 20000 までの整数にしてください。',
    '「高さの指定」は、1 から 20000 までの整数にしてください。',
  ],
  'progress.preparing': ['準備中…'],
  'progress.inspecting': ['「A Work」を調べています…'],
  'progress.organizing': ['「A Work」の各話を整理しています…'],
  'progress.organizingChapters': [
    '1 話を巻のファイルにまとめています…',
    '12 話を巻のファイルにまとめています…',
  ],
  'progress.bindingLibrary': ['ライブラリの巻ファイルを作成しています…'],
  'progress.buildingVolume': ['3 巻中 2 巻目を作成しています…'],
  'progress.converting': [
    '3 巻中 1 巻目を変換しています…',
    'Good Manga · 3 巻中 2 巻目を変換しています…',
  ],
  'progress.savingVolume': [
    '3 巻中 1 巻目を保存しています…',
    'Good Manga · 3 巻中 2 巻目を保存しています…',
  ],
  'progress.pageProcessed': ['10 ページ中 7 ページを処理しました。'],
  'progress.stageStarted': [
    '読み込みを開始しています…',
    '計画を開始しています…',
    '処理を開始しています…',
    'メタデータの処理を開始しています…',
    'パッケージ化を開始しています…',
    'future を開始しています…',
    'constructor を開始しています…',
  ],
  'progress.savingBook': ['完成した本を保存しています…'],
  'progress.volumesConverted': [
    '3 巻中 1 巻の変換が完了しました。',
    'Good Manga · 2 巻中 2 巻の変換が完了しました。',
  ],
  'progress.booksSaved': ['1 冊を保存しました。', '2 冊を保存しました。'],
  'plan.mangaprep': [
    'mangaprep の検証: KV · 1072 × 1448 · ライブラリのファイルは書き込まれていません',
    'mangaprep の検証: KV · 1072 × 1448 · 1 冊、各話はまとめていません · ライブラリのファイルは書き込まれていません',
  ],
  'plan.mangabind': [
    'mangabind の検証: 1 巻 · ライブラリのファイルは書き込まれていません',
    'mangabind の検証: 2 巻 · CBZ ファイルとして保存（mangaprep は実行しません） · ライブラリのファイルは書き込まれていません',
    'mangabind の検証: 2 巻 · シリーズ全体で 1 冊 · ライブラリのファイルは書き込まれていません',
  ],
  'plan.series': [
    'mangabind の検証: 16 話 · シリーズ全体で 1 冊 · ライブラリのファイルは書き込まれていません',
    'mangabind の検証: 1 話（2 巻） · シリーズ全体で 1 冊 · ライブラリのファイルは書き込まれていません',
    'mangabind の検証: シリーズ · シリーズ全体で 1 冊 · ライブラリのファイルは書き込まれていません',
  ],
  'plan.library': [
    'mangabind の検証: 1 タイトル · 1 巻 · ライブラリのファイルは書き込まれていません',
    'mangabind の検証: 2 タイトル · 5 巻 · CBZ ファイルとして保存（mangaprep は実行しません） · ライブラリのファイルは書き込まれていません',
    'mangabind の検証: 1 タイトル · 3 巻 · EPUB 1 冊（シリーズごとに 1 冊） · ライブラリのファイルは書き込まれていません',
    'mangabind の検証: 2 タイトル · 5 巻 · EPUB 2 冊（シリーズごとに 1 冊） · ライブラリのファイルは書き込まれていません',
  ],
  'summary.joined': ['まとめた巻 · CBZ'],
  'summary.books': ['Kindle 11 · EPUB', 'Kindle 11 · EPUB · 専用のオプション 2 個'],
  'summary.earlier': ['保存または共有できます'],
  'warning.title': [
    'ページが画面より小さい',
    'すでに一度変換されたページ',
    '画像ではないファイルを除外しました',
    '本の隣にある .json ファイルは使われませんでした',
    'ラベル付きの見開きの一部は、結合されませんでした',
    '別の名前で保存しました',
    '途中で終わっているページには空白があります',
    'コピーが複数ある話を除外しました',
    '巻の中で話が抜けています',
    'ページのない話を除外しました',
    'フォルダーの外を指すリンクを除外しました',
    '話の中の、ページ画像ではないファイルを除外しました',
    '展開すると大きすぎるページを除外しました',
    '編集した巻は、フォルダーに保存されませんでした',
  ],
  'warning.advice': [
    '4 分の 1 を超えるページが画面より小さく、拡大されていません。「ページのサイズ」で「画面に合わせる（小さいページは拡大）」を選ぶと、読みやすくなります。',
    'これらのページは、Kindle Comic Converter ですでに変換されたもののようです。もう一度変換すると、画質が下がります。元のファイルがあれば、そちらを使ってください。',
    '入力には、ページの画像ではないファイルが含まれています。それらは本に入りません。',
    '見開きのラベルの一覧ではなかったため、そのファイルなしで本を作成しました。',
    'ラベルの付いた位置に、結合できるページがありませんでした。ほかの見開きは結合されています。',
    'このままでは、本が元のファイル自身を置き換えてしまうため、別の名前を付けました。',
    'ページのファイルが、画像の途中で終わっています。多くの場合、ダウンロードが途中で止まったことが原因です。本には読み取れた部分が入り、そのページの残りは空白になります。ページ全体を取得するには、その話をもう一度ダウンロードしてください。',
    'フォルダー内に同じ話が複数あると、コピーを見分けられないため、どのコピーも本に入りません。そのフォルダーだけを追加して「本と巻を編集」で使うコピーを選ぶか、1 つを残してほかのコピーをフォルダーから取り除き、もう一度変換してください。',
    '巻の最初の話と最後の話の間に、抜けている話の番号があります。フォルダーにない場合、本はそれらの話なしで作られます。',
    '入力の中に、ページが 1 つもない話があるため、本には入りません。',
    'フォルダー内のファイルが、フォルダー内のファイルを指さないリンクです（フォルダーの外、フォルダー、または何もないものを指しています）。そのため本にはコピーしていません。ほかの人から受け取ったフォルダーを使って、お使いのパソコンのファイルが本に混ざるのを防ぐためです。そのページを入れたい場合は、ファイルのコピーをフォルダーに置いて、もう一度変換してください。',
    '話の中に、名前から画像（JPEG、PNG、WebP、GIF、BMP、AVIF、JPEG XL、TIFF）とわからないファイルがあるため、本のページには入りません。そのうちの 1 つがページなら、その形式の拡張子を付けて、もう一度変換してください。',
    '.cbz の話の中のページが、1 ページとしてはあり得ないほど大きく展開される（256 MiB を超えるか、アーカイブ内のサイズの 1000 倍を超える）と示しています。これはコンピューターのメモリを埋め尽くすために作られたファイルの特徴なので、本には入りません。本物のページなら、通常の画像として保存し直して、もう一度変換してください。',
    '本は編集した巻のとおりに作られますが、フォルダーの mangabind.json に保存できませんでした。フォルダーに書き込めないか、mangabind.json が正しい JSON ではありません。次にそのフォルダーを追加するときは、もう一度巻を編集する必要があります。',
  ],
  'warning.unknownTitle': ['mangaprep からのお知らせ'],
  'warning.inAll': ['対象は全 3 冊です。'],
  'warning.inOne': ['対象は One.epub です。'],
  'warning.inTwo': ['対象は One.epub と Two.epub です。'],
  'warning.inMore': ['対象は One.epub、Two.epub、ほか 3 冊です。'],
  'toolchain.ready': ['同梱の変換ツールは検証済みで、使用できます。'],
  'toolchain.unavailable': ['同梱のツールが復元されるまで、変換は利用できません。'],
  'toolchain.noTarget': ['Manga2Ink は linux-arm64 向けのツールを同梱していません。'],
  'toolchain.manifestUnverified': [
    '同梱ツールのマニフェストを検証できませんでした。Manga2Ink を再インストールしてください。',
  ],
  'toolchain.checkFailed': ['同梱の変換ツールを確認できませんでした。'],
  'toolchain.toolReady': ['mangabind v0.7.2 は検証済みです。'],
  'toolchain.toolFailed': [
    'mangaprep を検証できませんでした。Manga2Ink を再インストールして、同梱のツールを復元してください。',
  ],
};
