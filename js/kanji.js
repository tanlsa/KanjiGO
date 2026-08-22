// ============================================================
//  KANJI.JS — DỮ LIỆU HỌC KANJI MẶC ĐỊNH (ngân hàng câu hỏi On/Kun).
//  Mỗi câu lưu cả cách đọc Kanji mục tiêu và cách đọc/nghĩa của toàn bộ từ.
//
//  ┌─ CÁCH ADMIN THÊM CHỮ / CÂU (2 cách) ────────────────────┐
//  │ • DỄ NHẤT: mở admin.html -> dán bảng từ Excel -> "Áp dụng │
//  │   vào game". KHÔNG cần sửa file này.                      │
//  │ • Thủ công: thêm entry vào KANJI + QUESTIONS bên dưới.    │
//  └──────────────────────────────────────────────────────────┘
//
//  SCHEMA (khớp cột trong admin.html / data/*.csv):
//   KANJI[key] = { char, meaning, on:[...], kun:[...], monId, jlpt }
//   QUESTIONS  = { word, mean, target, answer, romaji, type, wordReading, wordRomaji, parts[] }
//   parts[]     = { text, reading, romaji, meaning, role('target'|'support'|'kana') }
//   monId phải khớp 1 id trong CONFIG.MONSTERS.
// ============================================================
window.KANJI_DB = {
  // Thông tin từng kanji (dùng cho Kanji Dex)
  KANJI: {
    on:  { char: '音', meaning: 'Âm thanh', on: ['オン (on)'], kun: ['おと (oto)'], monId: 'yin', jlpt: 'N4' },
    ri:  { char: '日', meaning: 'Ngày / Mặt trời', on: ['ニチ (nichi)', 'ジツ (jitsu)'], kun: ['ひ (hi)', 'か (ka)'], monId: 'ri', jlpt: 'N5' },
    ichi:{ char: '一', meaning: 'Một', on: ['イチ (ichi)', 'イツ (itsu)'], kun: ['ひと (hito)', 'ひとつ (hitotsu)'], monId: 'bar', jlpt: 'N5' },
    koku:{ char: '国', meaning: 'Quốc gia', on: ['コク (koku)'], kun: ['くに (kuni)'], monId: 'kuni', jlpt: 'N5' },
    nen: { char: '年', meaning: 'Năm', on: ['ネン (nen)'], kun: ['とし (toshi)'], monId: 'nen', jlpt: 'N5' },
    dai: { char: '大', meaning: 'To / Lớn', on: ['ダイ (dai)', 'タイ (tai)'], kun: ['おお (oo)'], monId: 'dai', jlpt: 'N5' },
    fish:{ char: '魚', meaning: 'Cá', on: ['ギョ (gyo)'], kun: ['さかな (sakana)', 'うお (uo)'], monId: 'fish', jlpt: 'BONUS' },
    hito:{ char: '人', meaning: 'Người', on: ['ジン (jin)', 'ニン (nin)'], kun: ['ひと (hito)'], monId: 'hito', jlpt: 'N5' },
    juu: { char: '十', meaning: 'Mười', on: ['ジュウ (juu)'], kun: ['とお (too)'], monId: 'juu', jlpt: 'N5' },
    ni:  { char: '二', meaning: 'Hai', on: ['ニ (ni)'], kun: ['ふた (futa)', 'ふたつ (futatsu)'], monId: 'ni', jlpt: 'N5' },
    hon: { char: '本', meaning: 'Sách / Gốc', on: ['ホン (hon)'], kun: ['もと (moto)'], monId: 'hon', jlpt: 'N5' },
    chuu:{ char: '中', meaning: 'Giữa / Trong', on: ['チュウ (chuu)'], kun: ['なか (naka)'], monId: 'chuu', jlpt: 'N5' },
    chou:{ char: '長', meaning: 'Dài / Trưởng', on: ['チョウ (chou)'], kun: ['なが (naga)'], monId: 'chou', jlpt: 'N5' },
    shutsu:{ char: '出', meaning: 'Ra / Xuất', on: ['シュツ (shutsu)'], kun: ['で (de)', 'だ (da)'], monId: 'shutsu', jlpt: 'N5' },
    san: { char: '三', meaning: 'Ba', on: ['サン (san)'], kun: ['み (mi)', 'みっつ (mittsu)'], monId: 'san', jlpt: 'N5' },
    ji:  { char: '時', meaning: 'Thời gian / Giờ', on: ['ジ (ji)'], kun: ['とき (toki)'], monId: 'ji', jlpt: 'N5' },
    gyou:{ char: '行', meaning: 'Đi / Hành', on: ['コウ (kou)', 'ギョウ (gyou)'], kun: ['い (i)', 'ゆ (yu)'], monId: 'gyou', jlpt: 'N5' },
    ken: { char: '見', meaning: 'Nhìn / Thấy', on: ['ケン (ken)'], kun: ['み (mi)'], monId: 'ken', jlpt: 'N5' },
    ima: { char: '今', meaning: 'Bây giờ / Nay', on: ['コン (kon)', 'キン (kin)'], kun: ['いま (ima)'], monId: 'ima', jlpt: 'N5' },
    getsu:{ char: '月', meaning: 'Tháng / Mặt trăng', on: ['ゲツ (getsu)', 'ガツ (gatsu)'], kun: ['つき (tsuki)'], monId: 'getsu', jlpt: 'N5' },
    bun: { char: '分', meaning: 'Phần / Phút / Chia', on: ['ブン (bun)', 'フン (fun)', 'プン (pun)'], kun: ['わ (wa)'], monId: 'bun', jlpt: 'N5' },
    ato: { char: '後', meaning: 'Sau / Phía sau', on: ['ゴ (go)', 'コウ (kou)'], kun: ['あと (ato)', 'うしろ (ushiro)', 'のち (nochi)'], monId: 'ato', jlpt: 'N5' },
    mae: { char: '前', meaning: 'Trước / Phía trước', on: ['ゼン (zen)'], kun: ['まえ (mae)'], monId: 'mae', jlpt: 'N5' },
    sei: { char: '生', meaning: 'Sống / Sinh', on: ['セイ (sei)', 'ショウ (shou)'], kun: ['い (i)', 'う (u)', 'なま (nama)'], monId: 'sei', jlpt: 'N5' },
    go:  { char: '五', meaning: 'Năm', on: ['ゴ (go)'], kun: ['いつ (itsu)'], monId: 'go', jlpt: 'N5' },
    kan: { char: '間', meaning: 'Khoảng / Giữa', on: ['カン (kan)', 'ケン (ken)', 'ゲン (gen)'], kun: ['あいだ (aida)', 'ま (ma)'], monId: 'kan', jlpt: 'N5' },
    ue:  { char: '上', meaning: 'Trên / Lên', on: ['ジョウ (jou)', 'ショウ (shou)'], kun: ['うえ (ue)', 'あ (a)', 'うわ (uwa)'], monId: 'ue', jlpt: 'N5' },
    higashi:{ char: '東', meaning: 'Đông / Phía Đông', on: ['トウ (tou)'], kun: ['ひがし (higashi)'], monId: 'higashi', jlpt: 'N5' },
    yon: { char: '四', meaning: 'Bốn', on: ['シ (shi)'], kun: ['よん (yon)', 'よ (yo)', 'よっつ (yottsu)'], monId: 'yon', jlpt: 'N5' },
    kin: { char: '金', meaning: 'Vàng / Tiền', on: ['キン (kin)', 'コン (kon)'], kun: ['かね (kane)'], monId: 'kin', jlpt: 'N5' },
    kyuu:{ char: '九', meaning: 'Chín', on: ['キュウ (kyuu)', 'ク (ku)'], kun: ['ここの (kokono)', 'ここのつ (kokonotsu)'], monId: 'kyuu', jlpt: 'N5' },
    nyuu:{ char: '入', meaning: 'Vào / Nhập', on: ['ニュウ (nyuu)'], kun: ['い (i)', 'はい (hai)'], monId: 'nyuu', jlpt: 'N5' },
    gaku:{ char: '学', meaning: 'Học', on: ['ガク (gaku)'], kun: ['まな (mana)'], monId: 'gaku', jlpt: 'N5' },
    kou: { char: '高', meaning: 'Cao / Đắt', on: ['コウ (kou)'], kun: ['たか (taka)'], monId: 'kou', jlpt: 'N5' },
    en:  { char: '円', meaning: 'Yên / Tròn', on: ['エン (en)'], kun: ['まる (maru)'], monId: 'en', jlpt: 'N5' },
    ko:  { char: '子', meaning: 'Trẻ em / Con', on: ['シ (shi)', 'ス (su)'], kun: ['こ (ko)'], monId: 'ko', jlpt: 'N5' },
    gai: { char: '外', meaning: 'Ngoài', on: ['ガイ (gai)', 'ゲ (ge)'], kun: ['そと (soto)', 'ほか (hoka)'], monId: 'gai', jlpt: 'N5' },
    hachi:{ char: '八', meaning: 'Tám', on: ['ハチ (hachi)'], kun: ['や (ya)', 'やっつ (yattsu)'], monId: 'hachi', jlpt: 'N5' },
    roku:{ char: '六', meaning: 'Sáu', on: ['ロク (roku)'], kun: ['む (mu)', 'むっつ (muttsu)'], monId: 'roku', jlpt: 'N5' },
    shita:{ char: '下', meaning: 'Dưới / Xuống', on: ['カ (ka)', 'ゲ (ge)'], kun: ['した (shita)', 'さ (sa)', 'くだ (kuda)'], monId: 'shita', jlpt: 'N5' },
    rai: { char: '来', meaning: 'Đến / Tới', on: ['ライ (rai)'], kun: ['く (ku)', 'き (ki)'], monId: 'rai', jlpt: 'N5' },
    ki:  { char: '気', meaning: 'Khí / Tinh thần', on: ['キ (ki)', 'ケ (ke)'], kun: [], monId: 'ki', jlpt: 'N5' },
    shou:{ char: '小', meaning: 'Nhỏ / Bé', on: ['ショウ (shou)'], kun: ['ちい (chii)', 'こ (ko)', 'お (o)'], monId: 'shou', jlpt: 'N5' },
    nana:{ char: '七', meaning: 'Bảy', on: ['シチ (shichi)'], kun: ['なな (nana)', 'なの (nano)'], monId: 'nana', jlpt: 'N5' },
    yama:{ char: '山', meaning: 'Núi', on: ['サン (san)', 'ザン (zan)'], kun: ['やま (yama)'], monId: 'yama', jlpt: 'N5' },
    hanashi:{ char: '話', meaning: 'Nói / Câu chuyện', on: ['ワ (wa)'], kun: ['はな (hana)', 'はなし (hanashi)'], monId: 'hanashi', jlpt: 'N5' },
    onna:{ char: '女', meaning: 'Nữ / Phụ nữ', on: ['ジョ (jo)', 'ニョ (nyo)'], kun: ['おんな (onna)', 'め (me)'], monId: 'onna', jlpt: 'N5' },
    kita:{ char: '北', meaning: 'Bắc / Phía Bắc', on: ['ホク (hoku)'], kun: ['きた (kita)'], monId: 'kita', jlpt: 'N5' },
    gozen:{ char: '午', meaning: 'Trưa / Ngọ', on: ['ゴ (go)'], kun: [], monId: 'gozen', jlpt: 'N5' },
    hyaku:{ char: '百', meaning: 'Một trăm', on: ['ヒャク (hyaku)', 'ビャク (byaku)', 'ピャク (pyaku)'], kun: ['もも (momo)'], monId: 'hyaku', jlpt: 'N5' },
    sho:{ char: '書', meaning: 'Viết / Sách', on: ['ショ (sho)'], kun: ['か (ka)'], monId: 'sho', jlpt: 'N5' },
    saki:{ char: '先', meaning: 'Trước / Đi trước', on: ['セン (sen)'], kun: ['さき (saki)'], monId: 'saki', jlpt: 'N5' },
    na:{ char: '名', meaning: 'Tên / Danh', on: ['メイ (mei)', 'ミョウ (myou)'], kun: ['な (na)'], monId: 'na', jlpt: 'N5' },
    kawa:{ char: '川', meaning: 'Sông', on: ['セン (sen)'], kun: ['かわ (kawa)'], monId: 'kawa', jlpt: 'N5' },
    sen:{ char: '千', meaning: 'Một nghìn', on: ['セン (sen)'], kun: ['ち (chi)'], monId: 'sen', jlpt: 'N5' },
    mizu:{ char: '水', meaning: 'Nước', on: ['スイ (sui)'], kun: ['みず (mizu)'], monId: 'mizu', jlpt: 'N5' },
    han:{ char: '半', meaning: 'Một nửa / Bán', on: ['ハン (han)'], kun: ['なか (naka)', 'なかば (nakaba)'], monId: 'han', jlpt: 'N5' },
    otoko:{ char: '男', meaning: 'Nam / Đàn ông', on: ['ダン (dan)', 'ナン (nan)'], kun: ['おとこ (otoko)'], monId: 'otoko', jlpt: 'N5' },
    nishi:{ char: '西', meaning: 'Tây / Phía Tây', on: ['セイ (sei)', 'サイ (sai)'], kun: ['にし (nishi)'], monId: 'nishi', jlpt: 'N5' },
    den:{ char: '電', meaning: 'Điện', on: ['デン (den)'], kun: [], monId: 'den', jlpt: 'N5' },
    go_lang:{ char: '語', meaning: 'Ngôn ngữ / Từ ngữ', on: ['ゴ (go)'], kun: ['かた (kata)'], monId: 'go_lang', jlpt: 'N5' },
    tsuchi:{ char: '土', meaning: 'Đất / Thổ', on: ['ド (do)', 'ト (to)'], kun: ['つち (tsuchi)'], monId: 'tsuchi', jlpt: 'N5' },
    moku:{ char: '木', meaning: 'Cây / Gỗ', on: ['モク (moku)', 'ボク (boku)'], kun: ['き (ki)', 'こ (ko)'], monId: 'moku', jlpt: 'N5' },
    shoku:{ char: '食', meaning: 'Ăn / Thức ăn', on: ['ショク (shoku)', 'ジキ (jiki)'], kun: ['た (ta)', 'く (ku)'], monId: 'shoku', jlpt: 'N5' },
    kuruma:{ char: '車', meaning: 'Xe', on: ['シャ (sha)'], kun: ['くるま (kuruma)'], monId: 'kuruma', jlpt: 'N5' },
    minami:{ char: '南', meaning: 'Nam / Phía Nam', on: ['ナン (nan)'], kun: ['みなみ (minami)'], monId: 'minami', jlpt: 'N5' },
    nani:{ char: '何', meaning: 'Gì / Bao nhiêu', on: ['カ (ka)'], kun: ['なに (nani)', 'なん (nan)'], monId: 'nani', jlpt: 'N5' },
    man:{ char: '万', meaning: 'Mười nghìn / Vạn', on: ['マン (man)', 'バン (ban)'], kun: ['よろず (yorozu)'], monId: 'man', jlpt: 'N5' },
    kou_school:{ char: '校', meaning: 'Trường học / Hiệu', on: ['コウ (kou)'], kun: [], monId: 'kou_school', jlpt: 'N5' },
    mai:{ char: '毎', meaning: 'Mỗi', on: ['マイ (mai)'], kun: ['ごと (goto)'], monId: 'mai', jlpt: 'N5' },
    shiro:{ char: '白', meaning: 'Trắng / Bạch', on: ['ハク (haku)', 'ビャク (byaku)'], kun: ['しろ (shiro)', 'しら (shira)'], monId: 'shiro', jlpt: 'N5' },
    ten:{ char: '天', meaning: 'Trời / Thiên', on: ['テン (ten)'], kun: ['あめ (ame)', 'あま (ama)'], monId: 'ten', jlpt: 'N5' },
    haha:{ char: '母', meaning: 'Mẹ / Mẫu', on: ['ボ (bo)'], kun: ['はは (haha)', 'かあ (kaa)'], monId: 'haha', jlpt: 'N5' },
    hi_fire:{ char: '火', meaning: 'Lửa / Hỏa', on: ['カ (ka)'], kun: ['ひ (hi)', 'ほ (ho)'], monId: 'hi_fire', jlpt: 'N5' },
    migi:{ char: '右', meaning: 'Phải / Bên phải', on: ['ウ (u)', 'ユウ (yuu)'], kun: ['みぎ (migi)'], monId: 'migi', jlpt: 'N5' },
    yomu:{ char: '読', meaning: 'Đọc', on: ['ドク (doku)', 'トク (toku)', 'トウ (tou)'], kun: ['よ (yo)'], monId: 'yomu', jlpt: 'N5' },
    tomo:{ char: '友', meaning: 'Bạn bè / Hữu', on: ['ユウ (yuu)'], kun: ['とも (tomo)'], monId: 'tomo', jlpt: 'N5' },
    hidari:{ char: '左', meaning: 'Trái / Bên trái', on: ['サ (sa)'], kun: ['ひだり (hidari)'], monId: 'hidari', jlpt: 'N5' },
    yasumi:{ char: '休', meaning: 'Nghỉ / Hưu', on: ['キュウ (kyuu)'], kun: ['やす (yasu)'], monId: 'yasumi', jlpt: 'N5' },
    chichi:{ char: '父', meaning: 'Cha / Bố / Phụ', on: ['フ (fu)'], kun: ['ちち (chichi)', 'とう (tou)'], monId: 'chichi', jlpt: 'N5' },
    ame:{ char: '雨', meaning: 'Mưa / Vũ', on: ['ウ (u)'], kun: ['あめ (ame)', 'あま (ama)'], monId: 'ame', jlpt: 'N5' },
    aku:{ char: '悪', meaning: 'Xấu / Ác', on: ['アク (aku)', 'オ (o)'], kun: ['わる (waru)'], monId: 'aku', jlpt: 'N4' },
    an:{ char: '暗', meaning: 'Tối / Ám', on: ['アン (an)'], kun: ['くら (kura)'], monId: 'an', jlpt: 'N4' },
    i_med:{ char: '医', meaning: 'Y học / Bác sĩ', on: ['イ (i)'], kun: [], monId: 'i_med', jlpt: 'N4' },
    i_intent:{ char: '意', meaning: 'Ý / Ý định', on: ['イ (i)'], kun: [], monId: 'i_intent', jlpt: 'N4' },
  },

  // Ngân hàng câu hỏi. Mỗi câu:
  //  word: từ hiển thị (có chứa kanji) | mean: nghĩa của từ
  //  target: chữ kanji đang hỏi | answer: cách đọc đúng CỦA CHỮ ĐÓ trong từ
  //  type: 'on' | 'kun' (để hiện nhãn sau khi trả lời)
  //  options: 4 lựa chọn (đã gồm answer). Nếu để trống engine tự random distractor.
  QUESTIONS: [
    // 音
    { word: '音楽', mean: 'âm nhạc', target: '音', answer: 'おん', romaji: 'on', type: 'on', wordReading: 'おんがく', wordRomaji: 'ongaku', parts: [
      { text: '音', reading: 'おん', romaji: 'on', meaning: 'âm thanh', role: 'target' }, { text: '楽', reading: 'がく', romaji: 'gaku', meaning: 'nhạc', role: 'support' }] },
    { word: '足音', mean: 'tiếng bước chân', target: '音', answer: 'おと', romaji: 'oto', type: 'kun', wordReading: 'あしおと', wordRomaji: 'ashioto', parts: [
      { text: '足', reading: 'あし', romaji: 'ashi', meaning: 'chân', role: 'support' }, { text: '音', reading: 'おと', romaji: 'oto', meaning: 'âm thanh', role: 'target' }] },
    // 日
    { word: '毎日', mean: 'mỗi ngày', target: '日', answer: 'にち', romaji: 'nichi', type: 'on', wordReading: 'まいにち', wordRomaji: 'mainichi', parts: [
      { text: '毎', reading: 'まい', romaji: 'mai', meaning: 'mỗi', role: 'support' }, { text: '日', reading: 'にち', romaji: 'nichi', meaning: 'ngày', role: 'target' }] },
    { word: '日曜日', mean: 'Chủ Nhật', target: '日', answer: 'にち', romaji: 'nichi', type: 'on', wordReading: 'にちようび', wordRomaji: 'nichiyoubi', parts: [
      { text: '日', reading: 'にち', romaji: 'nichi', meaning: 'ngày', role: 'target' }, { text: '曜', reading: 'よう', romaji: 'you', meaning: 'thứ', role: 'support' }, { text: '日', reading: 'び', romaji: 'bi', meaning: 'ngày', role: 'support' }] },
    { word: '日', mean: 'ngày / mặt trời', target: '日', answer: 'ひ', romaji: 'hi', type: 'kun', wordReading: 'ひ', wordRomaji: 'hi', parts: [
      { text: '日', reading: 'ひ', romaji: 'hi', meaning: 'ngày / mặt trời', role: 'target' }] },
    // 一
    { word: '一月', mean: 'tháng Một', target: '一', answer: 'いち', romaji: 'ichi', type: 'on', wordReading: 'いちがつ', wordRomaji: 'ichigatsu', parts: [
      { text: '一', reading: 'いち', romaji: 'ichi', meaning: 'một', role: 'target' }, { text: '月', reading: 'がつ', romaji: 'gatsu', meaning: 'tháng', role: 'support' }] },
    { word: '一年', mean: 'một năm', target: '一', answer: 'いち', romaji: 'ichi', type: 'on', wordReading: 'いちねん', wordRomaji: 'ichinen', parts: [
      { text: '一', reading: 'いち', romaji: 'ichi', meaning: 'một', role: 'target' }, { text: '年', reading: 'ねん', romaji: 'nen', meaning: 'năm', role: 'support' }] },
    { word: '一つ', mean: 'một cái', target: '一', answer: 'ひと', romaji: 'hito', type: 'kun', wordReading: 'ひとつ', wordRomaji: 'hitotsu', parts: [
      { text: '一', reading: 'ひと', romaji: 'hito', meaning: 'một', role: 'target' }, { text: 'つ', reading: 'つ', romaji: 'tsu', meaning: 'trợ từ đếm', role: 'kana' }] },
    // 国
    { word: '国語', mean: 'quốc ngữ (môn Văn)', target: '国', answer: 'こく', romaji: 'koku', type: 'on', wordReading: 'こくご', wordRomaji: 'kokugo', parts: [
      { text: '国', reading: 'こく', romaji: 'koku', meaning: 'quốc gia', role: 'target' }, { text: '語', reading: 'ご', romaji: 'go', meaning: 'ngôn ngữ', role: 'support' }] },
    { word: '外国', mean: 'nước ngoài', target: '国', answer: 'こく', romaji: 'koku', type: 'on', wordReading: 'がいこく', wordRomaji: 'gaikoku', parts: [
      { text: '外', reading: 'がい', romaji: 'gai', meaning: 'ngoài', role: 'support' }, { text: '国', reading: 'こく', romaji: 'koku', meaning: 'quốc gia', role: 'target' }] },
    { word: '国', mean: 'đất nước', target: '国', answer: 'くに', romaji: 'kuni', type: 'kun', wordReading: 'くに', wordRomaji: 'kuni', parts: [
      { text: '国', reading: 'くに', romaji: 'kuni', meaning: 'đất nước', role: 'target' }] },
    // 年
    { word: '去年', mean: 'năm ngoái', target: '年', answer: 'ねん', romaji: 'nen', type: 'on', wordReading: 'きょねん', wordRomaji: 'kyonen', parts: [
      { text: '去', reading: 'きょ', romaji: 'kyo', meaning: 'đã qua', role: 'support' }, { text: '年', reading: 'ねん', romaji: 'nen', meaning: 'năm', role: 'target' }] },
    { word: '毎年', mean: 'mỗi năm', target: '年', answer: 'ねん', romaji: 'nen', type: 'on', wordReading: 'まいねん', wordRomaji: 'mainen', parts: [
      { text: '毎', reading: 'まい', romaji: 'mai', meaning: 'mỗi', role: 'support' }, { text: '年', reading: 'ねん', romaji: 'nen', meaning: 'năm', role: 'target' }] },
    { word: '年', mean: 'tuổi / năm', target: '年', answer: 'とし', romaji: 'toshi', type: 'kun', wordReading: 'とし', wordRomaji: 'toshi', parts: [
      { text: '年', reading: 'とし', romaji: 'toshi', meaning: 'tuổi / năm', role: 'target' }] },
    // 大
    { word: '大学', mean: 'đại học', target: '大', answer: 'だい', romaji: 'dai', type: 'on', wordReading: 'だいがく', wordRomaji: 'daigaku', parts: [
      { text: '大', reading: 'だい', romaji: 'dai', meaning: 'lớn', role: 'target' }, { text: '学', reading: 'がく', romaji: 'gaku', meaning: 'học', role: 'support' }] },
    { word: '大切', mean: 'quan trọng', target: '大', answer: 'たい', romaji: 'tai', type: 'on', wordReading: 'たいせつ', wordRomaji: 'taisetsu', parts: [
      { text: '大', reading: 'たい', romaji: 'tai', meaning: 'lớn', role: 'target' }, { text: '切', reading: 'せつ', romaji: 'setsu', meaning: 'thiết yếu', role: 'support' }] },
    { word: '大きい', mean: 'to, lớn', target: '大', answer: 'おお', romaji: 'oo', type: 'kun', wordReading: 'おおきい', wordRomaji: 'ookii', parts: [
      { text: '大', reading: 'おお', romaji: 'oo', meaning: 'lớn', role: 'target' }, { text: 'きい', reading: 'きい', romaji: 'kii', meaning: '', role: 'kana' }] },
    // 魚
    { word: '金魚', mean: 'cá vàng', target: '魚', answer: 'ぎょ', romaji: 'gyo', type: 'on', wordReading: 'きんぎょ', wordRomaji: 'kingyo', parts: [
      { text: '金', reading: 'きん', romaji: 'kin', meaning: 'vàng', role: 'support' }, { text: '魚', reading: 'ぎょ', romaji: 'gyo', meaning: 'cá', role: 'target' }] },
    { word: '魚', mean: 'cá', target: '魚', answer: 'さかな', romaji: 'sakana', type: 'kun', wordReading: 'さかな', wordRomaji: 'sakana', parts: [
      { text: '魚', reading: 'さかな', romaji: 'sakana', meaning: 'cá', role: 'target' }] },
    { word: '魚市場', mean: 'chợ cá', target: '魚', answer: 'うお', romaji: 'uo', type: 'kun', wordReading: 'うおいちば', wordRomaji: 'uoichiba', parts: [
      { text: '魚', reading: 'うお', romaji: 'uo', meaning: 'cá', role: 'target' }, { text: '市場', reading: 'いちば', romaji: 'ichiba', meaning: 'chợ', role: 'support' }] },
    // 人
    { word: '日本人', mean: 'người Nhật Bản', target: '人', answer: 'じん', romaji: 'jin', type: 'on', wordReading: 'にほんじん', wordRomaji: 'nihonjin', parts: [
      { text: '日本', reading: 'にほん', romaji: 'nihon', meaning: 'Nhật Bản', role: 'support' }, { text: '人', reading: 'じん', romaji: 'jin', meaning: 'người', role: 'target' }] },
    { word: '三人', mean: 'ba người', target: '人', answer: 'にん', romaji: 'nin', type: 'on', wordReading: 'さんにん', wordRomaji: 'sannin', parts: [
      { text: '三', reading: 'さん', romaji: 'san', meaning: 'ba', role: 'support' }, { text: '人', reading: 'にん', romaji: 'nin', meaning: 'người', role: 'target' }] },
    { word: '人', mean: 'người', target: '人', answer: 'ひと', romaji: 'hito', type: 'kun', wordReading: 'ひと', wordRomaji: 'hito', parts: [
      { text: '人', reading: 'ひと', romaji: 'hito', meaning: 'người', role: 'target' }] },
    // 十
    { word: '十月', mean: 'tháng Mười', target: '十', answer: 'じゅう', romaji: 'juu', type: 'on', wordReading: 'じゅうがつ', wordRomaji: 'juugatsu', parts: [
      { text: '十', reading: 'じゅう', romaji: 'juu', meaning: 'mười', role: 'target' }, { text: '月', reading: 'がつ', romaji: 'gatsu', meaning: 'tháng', role: 'support' }] },
    { word: '十円', mean: 'mười yên', target: '十', answer: 'じゅう', romaji: 'juu', type: 'on', wordReading: 'じゅうえん', wordRomaji: 'juuen', parts: [
      { text: '十', reading: 'じゅう', romaji: 'juu', meaning: 'mười', role: 'target' }, { text: '円', reading: 'えん', romaji: 'en', meaning: 'yên', role: 'support' }] },
    { word: '十日', mean: 'ngày mùng mười / mười ngày', target: '十', answer: 'とお', romaji: 'too', type: 'kun', wordReading: 'とおか', wordRomaji: 'tooka', parts: [
      { text: '十', reading: 'とお', romaji: 'too', meaning: 'mười', role: 'target' }, { text: '日', reading: 'か', romaji: 'ka', meaning: 'ngày', role: 'support' }] },
    // 二
    { word: '二月', mean: 'tháng Hai', target: '二', answer: 'に', romaji: 'ni', type: 'on', wordReading: 'にがつ', wordRomaji: 'nigatsu', parts: [
      { text: '二', reading: 'に', romaji: 'ni', meaning: 'hai', role: 'target' }, { text: '月', reading: 'がつ', romaji: 'gatsu', meaning: 'tháng', role: 'support' }] },
    { word: '二年', mean: 'hai năm', target: '二', answer: 'に', romaji: 'ni', type: 'on', wordReading: 'にねん', wordRomaji: 'ninen', parts: [
      { text: '二', reading: 'に', romaji: 'ni', meaning: 'hai', role: 'target' }, { text: '年', reading: 'ねん', romaji: 'nen', meaning: 'năm', role: 'support' }] },
    { word: '二つ', mean: 'hai cái', target: '二', answer: 'ふた', romaji: 'futa', type: 'kun', wordReading: 'ふたつ', wordRomaji: 'futatsu', parts: [
      { text: '二', reading: 'ふた', romaji: 'futa', meaning: 'hai', role: 'target' }, { text: 'つ', reading: 'つ', romaji: 'tsu', meaning: 'trợ từ đếm', role: 'kana' }] },
    // 本
    { word: '日本', mean: 'Nhật Bản', target: '本', answer: 'ほん', romaji: 'hon', type: 'on', wordReading: 'にほん', wordRomaji: 'nihon', parts: [
      { text: '日', reading: 'に', romaji: 'ni', meaning: 'Nhật / mặt trời', role: 'support' }, { text: '本', reading: 'ほん', romaji: 'hon', meaning: 'gốc', role: 'target' }] },
    { word: '本当', mean: 'thật sự / sự thật', target: '本', answer: 'ほん', romaji: 'hon', type: 'on', wordReading: 'ほんとう', wordRomaji: 'hontou', parts: [
      { text: '本', reading: 'ほん', romaji: 'hon', meaning: 'gốc / chính', role: 'target' }, { text: '当', reading: 'とう', romaji: 'tou', meaning: 'đúng', role: 'support' }] },
    { word: '本', mean: 'gốc / căn nguyên', target: '本', answer: 'もと', romaji: 'moto', type: 'kun', wordReading: 'もと', wordRomaji: 'moto', parts: [
      { text: '本', reading: 'もと', romaji: 'moto', meaning: 'gốc / căn nguyên', role: 'target' }] },
    // 中
    { word: '中国', mean: 'Trung Quốc', target: '中', answer: 'ちゅう', romaji: 'chuu', type: 'on', wordReading: 'ちゅうごく', wordRomaji: 'chuugoku', parts: [
      { text: '中', reading: 'ちゅう', romaji: 'chuu', meaning: 'giữa', role: 'target' }, { text: '国', reading: 'ごく', romaji: 'goku', meaning: 'quốc gia', role: 'support' }] },
    { word: '中学校', mean: 'trường trung học cơ sở', target: '中', answer: 'ちゅう', romaji: 'chuu', type: 'on', wordReading: 'ちゅうがっこう', wordRomaji: 'chuugakkou', parts: [
      { text: '中', reading: 'ちゅう', romaji: 'chuu', meaning: 'trung', role: 'target' }, { text: '学校', reading: 'がっこう', romaji: 'gakkou', meaning: 'trường học', role: 'support' }] },
    { word: '中', mean: 'bên trong / ở giữa', target: '中', answer: 'なか', romaji: 'naka', type: 'kun', wordReading: 'なか', wordRomaji: 'naka', parts: [
      { text: '中', reading: 'なか', romaji: 'naka', meaning: 'bên trong / ở giữa', role: 'target' }] },
    // 長
    { word: '社長', mean: 'giám đốc công ty', target: '長', answer: 'ちょう', romaji: 'chou', type: 'on', wordReading: 'しゃちょう', wordRomaji: 'shachou', parts: [
      { text: '社', reading: 'しゃ', romaji: 'sha', meaning: 'công ty', role: 'support' }, { text: '長', reading: 'ちょう', romaji: 'chou', meaning: 'trưởng', role: 'target' }] },
    { word: '校長', mean: 'hiệu trưởng', target: '長', answer: 'ちょう', romaji: 'chou', type: 'on', wordReading: 'こうちょう', wordRomaji: 'kouchou', parts: [
      { text: '校', reading: 'こう', romaji: 'kou', meaning: 'trường', role: 'support' }, { text: '長', reading: 'ちょう', romaji: 'chou', meaning: 'trưởng', role: 'target' }] },
    { word: '長い', mean: 'dài', target: '長', answer: 'なが', romaji: 'naga', type: 'kun', wordReading: 'ながい', wordRomaji: 'nagai', parts: [
      { text: '長', reading: 'なが', romaji: 'naga', meaning: 'dài', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 出
    { word: '出口', mean: 'lối ra', target: '出', answer: 'で', romaji: 'de', type: 'kun', wordReading: 'でぐち', wordRomaji: 'deguchi', parts: [
      { text: '出', reading: 'で', romaji: 'de', meaning: 'ra', role: 'target' }, { text: '口', reading: 'ぐち', romaji: 'guchi', meaning: 'miệng / lối', role: 'support' }] },
    { word: '出る', mean: 'đi ra / xuất hiện', target: '出', answer: 'で', romaji: 'de', type: 'kun', wordReading: 'でる', wordRomaji: 'deru', parts: [
      { text: '出', reading: 'で', romaji: 'de', meaning: 'ra', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    { word: '出発', mean: 'khởi hành', target: '出', answer: 'しゅっ', romaji: 'shu', type: 'on', wordReading: 'しゅっぱつ', wordRomaji: 'shuppatsu', parts: [
      { text: '出', reading: 'しゅっ', romaji: 'shu', meaning: 'xuất / ra', role: 'target' }, { text: '発', reading: 'ぱつ', romaji: 'patsu', meaning: 'phát / khởi hành', role: 'support' }] },
    // 三
    { word: '三月', mean: 'tháng Ba', target: '三', answer: 'さん', romaji: 'san', type: 'on', wordReading: 'さんがつ', wordRomaji: 'sangatsu', parts: [
      { text: '三', reading: 'さん', romaji: 'san', meaning: 'ba', role: 'target' }, { text: '月', reading: 'がつ', romaji: 'gatsu', meaning: 'tháng', role: 'support' }] },
    { word: '三人', mean: 'ba người', target: '三', answer: 'さん', romaji: 'san', type: 'on', wordReading: 'さんにん', wordRomaji: 'sannin', parts: [
      { text: '三', reading: 'さん', romaji: 'san', meaning: 'ba', role: 'target' }, { text: '人', reading: 'にん', romaji: 'nin', meaning: 'người', role: 'support' }] },
    { word: '三つ', mean: 'ba cái', target: '三', answer: 'みっ', romaji: 'mi', type: 'kun', wordReading: 'みっつ', wordRomaji: 'mittsu', parts: [
      { text: '三', reading: 'みっ', romaji: 'mi', meaning: 'ba', role: 'target' }, { text: 'つ', reading: 'つ', romaji: 'tsu', meaning: 'trợ từ đếm', role: 'kana' }] },
    // 時
    { word: '時間', mean: 'thời gian', target: '時', answer: 'じ', romaji: 'ji', type: 'on', wordReading: 'じかん', wordRomaji: 'jikan', parts: [
      { text: '時', reading: 'じ', romaji: 'ji', meaning: 'thời gian', role: 'target' }, { text: '間', reading: 'かん', romaji: 'kan', meaning: 'khoảng', role: 'support' }] },
    { word: '六時', mean: 'sáu giờ', target: '時', answer: 'じ', romaji: 'ji', type: 'on', wordReading: 'ろくじ', wordRomaji: 'rokuji', parts: [
      { text: '六', reading: 'ろく', romaji: 'roku', meaning: 'sáu', role: 'support' }, { text: '時', reading: 'じ', romaji: 'ji', meaning: 'giờ', role: 'target' }] },
    { word: '時', mean: 'lúc / thời điểm', target: '時', answer: 'とき', romaji: 'toki', type: 'kun', wordReading: 'とき', wordRomaji: 'toki', parts: [
      { text: '時', reading: 'とき', romaji: 'toki', meaning: 'lúc / thời điểm', role: 'target' }] },
    // 行
    { word: '銀行', mean: 'ngân hàng', target: '行', answer: 'こう', romaji: 'kou', type: 'on', wordReading: 'ぎんこう', wordRomaji: 'ginkou', parts: [
      { text: '銀', reading: 'ぎん', romaji: 'gin', meaning: 'bạc', role: 'support' }, { text: '行', reading: 'こう', romaji: 'kou', meaning: 'hàng / cơ quan', role: 'target' }] },
    { word: '旅行', mean: 'du lịch', target: '行', answer: 'こう', romaji: 'kou', type: 'on', wordReading: 'りょこう', wordRomaji: 'ryokou', parts: [
      { text: '旅', reading: 'りょ', romaji: 'ryo', meaning: 'chuyến đi', role: 'support' }, { text: '行', reading: 'こう', romaji: 'kou', meaning: 'đi', role: 'target' }] },
    { word: '行く', mean: 'đi', target: '行', answer: 'い', romaji: 'i', type: 'kun', wordReading: 'いく', wordRomaji: 'iku', parts: [
      { text: '行', reading: 'い', romaji: 'i', meaning: 'đi', role: 'target' }, { text: 'く', reading: 'く', romaji: 'ku', meaning: '', role: 'kana' }] },
    // 見
    { word: '意見', mean: 'ý kiến', target: '見', answer: 'けん', romaji: 'ken', type: 'on', wordReading: 'いけん', wordRomaji: 'iken', parts: [
      { text: '意', reading: 'い', romaji: 'i', meaning: 'ý', role: 'support' }, { text: '見', reading: 'けん', romaji: 'ken', meaning: 'cách nhìn', role: 'target' }] },
    { word: '見学', mean: 'tham quan học tập', target: '見', answer: 'けん', romaji: 'ken', type: 'on', wordReading: 'けんがく', wordRomaji: 'kengaku', parts: [
      { text: '見', reading: 'けん', romaji: 'ken', meaning: 'xem', role: 'target' }, { text: '学', reading: 'がく', romaji: 'gaku', meaning: 'học', role: 'support' }] },
    { word: '見る', mean: 'nhìn / xem', target: '見', answer: 'み', romaji: 'mi', type: 'kun', wordReading: 'みる', wordRomaji: 'miru', parts: [
      { text: '見', reading: 'み', romaji: 'mi', meaning: 'nhìn', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 今
    { word: '今月', mean: 'tháng này', target: '今', answer: 'こん', romaji: 'kon', type: 'on', wordReading: 'こんげつ', wordRomaji: 'kongetsu', parts: [
      { text: '今', reading: 'こん', romaji: 'kon', meaning: 'này / hiện tại', role: 'target' }, { text: '月', reading: 'げつ', romaji: 'getsu', meaning: 'tháng', role: 'support' }] },
    { word: '今週', mean: 'tuần này', target: '今', answer: 'こん', romaji: 'kon', type: 'on', wordReading: 'こんしゅう', wordRomaji: 'konshuu', parts: [
      { text: '今', reading: 'こん', romaji: 'kon', meaning: 'này / hiện tại', role: 'target' }, { text: '週', reading: 'しゅう', romaji: 'shuu', meaning: 'tuần', role: 'support' }] },
    { word: '今', mean: 'bây giờ', target: '今', answer: 'いま', romaji: 'ima', type: 'kun', wordReading: 'いま', wordRomaji: 'ima', parts: [
      { text: '今', reading: 'いま', romaji: 'ima', meaning: 'bây giờ', role: 'target' }] },
    // 月
    { word: '月曜日', mean: 'thứ Hai', target: '月', answer: 'げつ', romaji: 'getsu', type: 'on', wordReading: 'げつようび', wordRomaji: 'getsuyoubi', parts: [
      { text: '月', reading: 'げつ', romaji: 'getsu', meaning: 'mặt trăng / thứ Hai', role: 'target' }, { text: '曜日', reading: 'ようび', romaji: 'youbi', meaning: 'ngày trong tuần', role: 'support' }] },
    { word: '一月', mean: 'tháng Một', target: '月', answer: 'がつ', romaji: 'gatsu', type: 'on', wordReading: 'いちがつ', wordRomaji: 'ichigatsu', parts: [
      { text: '一', reading: 'いち', romaji: 'ichi', meaning: 'một', role: 'support' }, { text: '月', reading: 'がつ', romaji: 'gatsu', meaning: 'tháng', role: 'target' }] },
    { word: '月', mean: 'mặt trăng', target: '月', answer: 'つき', romaji: 'tsuki', type: 'kun', wordReading: 'つき', wordRomaji: 'tsuki', parts: [
      { text: '月', reading: 'つき', romaji: 'tsuki', meaning: 'mặt trăng', role: 'target' }] },
    // 分
    { word: '半分', mean: 'một nửa', target: '分', answer: 'ぶん', romaji: 'bun', type: 'on', wordReading: 'はんぶん', wordRomaji: 'hanbun', parts: [
      { text: '半', reading: 'はん', romaji: 'han', meaning: 'nửa', role: 'support' }, { text: '分', reading: 'ぶん', romaji: 'bun', meaning: 'phần', role: 'target' }] },
    { word: '十分', mean: 'mười phút', target: '分', answer: 'ぷん', romaji: 'pun', type: 'on', wordReading: 'じゅっぷん', wordRomaji: 'juppun', parts: [
      { text: '十', reading: 'じゅっ', romaji: 'ju', meaning: 'mười', role: 'support' }, { text: '分', reading: 'ぷん', romaji: 'pun', meaning: 'phút', role: 'target' }] },
    { word: '分かる', mean: 'hiểu', target: '分', answer: 'わ', romaji: 'wa', type: 'kun', wordReading: 'わかる', wordRomaji: 'wakaru', parts: [
      { text: '分', reading: 'わ', romaji: 'wa', meaning: 'hiểu / phân biệt', role: 'target' }, { text: 'かる', reading: 'かる', romaji: 'karu', meaning: '', role: 'kana' }] },
    // 後
    { word: '午後', mean: 'buổi chiều', target: '後', answer: 'ご', romaji: 'go', type: 'on', wordReading: 'ごご', wordRomaji: 'gogo', parts: [
      { text: '午', reading: 'ご', romaji: 'go', meaning: 'trưa', role: 'support' }, { text: '後', reading: 'ご', romaji: 'go', meaning: 'sau', role: 'target' }] },
    { word: '後ろ', mean: 'phía sau', target: '後', answer: 'うし', romaji: 'ushi', type: 'kun', wordReading: 'うしろ', wordRomaji: 'ushiro', parts: [
      { text: '後', reading: 'うし', romaji: 'ushi', meaning: 'phía sau', role: 'target' }, { text: 'ろ', reading: 'ろ', romaji: 'ro', meaning: '', role: 'kana' }] },
    { word: '後で', mean: 'lát nữa / sau đó', target: '後', answer: 'あと', romaji: 'ato', type: 'kun', wordReading: 'あとで', wordRomaji: 'atode', parts: [
      { text: '後', reading: 'あと', romaji: 'ato', meaning: 'sau', role: 'target' }, { text: 'で', reading: 'で', romaji: 'de', meaning: '', role: 'kana' }] },
    // 前
    { word: '午前', mean: 'buổi sáng', target: '前', answer: 'ぜん', romaji: 'zen', type: 'on', wordReading: 'ごぜん', wordRomaji: 'gozen', parts: [
      { text: '午', reading: 'ご', romaji: 'go', meaning: 'trưa', role: 'support' }, { text: '前', reading: 'ぜん', romaji: 'zen', meaning: 'trước', role: 'target' }] },
    { word: '名前', mean: 'tên', target: '前', answer: 'まえ', romaji: 'mae', type: 'kun', wordReading: 'なまえ', wordRomaji: 'namae', parts: [
      { text: '名', reading: 'な', romaji: 'na', meaning: 'tên', role: 'support' }, { text: '前', reading: 'まえ', romaji: 'mae', meaning: 'phần sau của từ tên', role: 'target' }] },
    { word: '前', mean: 'phía trước / trước đây', target: '前', answer: 'まえ', romaji: 'mae', type: 'kun', wordReading: 'まえ', wordRomaji: 'mae', parts: [
      { text: '前', reading: 'まえ', romaji: 'mae', meaning: 'phía trước', role: 'target' }] },
    // 生
    { word: '学生', mean: 'học sinh', target: '生', answer: 'せい', romaji: 'sei', type: 'on', wordReading: 'がくせい', wordRomaji: 'gakusei', parts: [
      { text: '学', reading: 'がく', romaji: 'gaku', meaning: 'học', role: 'support' }, { text: '生', reading: 'せい', romaji: 'sei', meaning: 'người / sinh', role: 'target' }] },
    { word: '先生', mean: 'giáo viên', target: '生', answer: 'せい', romaji: 'sei', type: 'on', wordReading: 'せんせい', wordRomaji: 'sensei', parts: [
      { text: '先', reading: 'せん', romaji: 'sen', meaning: 'trước', role: 'support' }, { text: '生', reading: 'せい', romaji: 'sei', meaning: 'sinh', role: 'target' }] },
    { word: '生まれる', mean: 'được sinh ra', target: '生', answer: 'う', romaji: 'u', type: 'kun', wordReading: 'うまれる', wordRomaji: 'umareru', parts: [
      { text: '生', reading: 'う', romaji: 'u', meaning: 'sinh', role: 'target' }, { text: 'まれる', reading: 'まれる', romaji: 'mareru', meaning: '', role: 'kana' }] },
    // 五
    { word: '五月', mean: 'tháng Năm', target: '五', answer: 'ご', romaji: 'go', type: 'on', wordReading: 'ごがつ', wordRomaji: 'gogatsu', parts: [
      { text: '五', reading: 'ご', romaji: 'go', meaning: 'năm', role: 'target' }, { text: '月', reading: 'がつ', romaji: 'gatsu', meaning: 'tháng', role: 'support' }] },
    { word: '五人', mean: 'năm người', target: '五', answer: 'ご', romaji: 'go', type: 'on', wordReading: 'ごにん', wordRomaji: 'gonin', parts: [
      { text: '五', reading: 'ご', romaji: 'go', meaning: 'năm', role: 'target' }, { text: '人', reading: 'にん', romaji: 'nin', meaning: 'người', role: 'support' }] },
    { word: '五つ', mean: 'năm cái', target: '五', answer: 'いつ', romaji: 'itsu', type: 'kun', wordReading: 'いつつ', wordRomaji: 'itsutsu', parts: [
      { text: '五', reading: 'いつ', romaji: 'itsu', meaning: 'năm', role: 'target' }, { text: 'つ', reading: 'つ', romaji: 'tsu', meaning: 'trợ từ đếm', role: 'kana' }] },
    // 間
    { word: '時間', mean: 'thời gian', target: '間', answer: 'かん', romaji: 'kan', type: 'on', wordReading: 'じかん', wordRomaji: 'jikan', parts: [
      { text: '時', reading: 'じ', romaji: 'ji', meaning: 'thời', role: 'support' }, { text: '間', reading: 'かん', romaji: 'kan', meaning: 'khoảng', role: 'target' }] },
    { word: '人間', mean: 'con người', target: '間', answer: 'げん', romaji: 'gen', type: 'on', wordReading: 'にんげん', wordRomaji: 'ningen', parts: [
      { text: '人', reading: 'にん', romaji: 'nin', meaning: 'người', role: 'support' }, { text: '間', reading: 'げん', romaji: 'gen', meaning: 'cõi / giới', role: 'target' }] },
    { word: '間', mean: 'khoảng giữa', target: '間', answer: 'あいだ', romaji: 'aida', type: 'kun', wordReading: 'あいだ', wordRomaji: 'aida', parts: [
      { text: '間', reading: 'あいだ', romaji: 'aida', meaning: 'khoảng giữa', role: 'target' }] },
    // 上
    { word: '上手', mean: 'giỏi / khéo', target: '上', answer: 'じょう', romaji: 'jou', type: 'on', wordReading: 'じょうず', wordRomaji: 'jouzu', parts: [
      { text: '上', reading: 'じょう', romaji: 'jou', meaning: 'trên / giỏi', role: 'target' }, { text: '手', reading: 'ず', romaji: 'zu', meaning: 'tay / kỹ năng', role: 'support' }] },
    { word: '上げる', mean: 'nâng lên', target: '上', answer: 'あ', romaji: 'a', type: 'kun', wordReading: 'あげる', wordRomaji: 'ageru', parts: [
      { text: '上', reading: 'あ', romaji: 'a', meaning: 'lên', role: 'target' }, { text: 'げる', reading: 'げる', romaji: 'geru', meaning: '', role: 'kana' }] },
    { word: '上', mean: 'phía trên', target: '上', answer: 'うえ', romaji: 'ue', type: 'kun', wordReading: 'うえ', wordRomaji: 'ue', parts: [
      { text: '上', reading: 'うえ', romaji: 'ue', meaning: 'phía trên', role: 'target' }] },
    // 東
    { word: '東京', mean: 'Tokyo', target: '東', answer: 'とう', romaji: 'tou', type: 'on', wordReading: 'とうきょう', wordRomaji: 'toukyou', parts: [
      { text: '東', reading: 'とう', romaji: 'tou', meaning: 'phía Đông', role: 'target' }, { text: '京', reading: 'きょう', romaji: 'kyou', meaning: 'kinh đô', role: 'support' }] },
    { word: '東口', mean: 'cửa phía Đông', target: '東', answer: 'ひがし', romaji: 'higashi', type: 'kun', wordReading: 'ひがしぐち', wordRomaji: 'higashiguchi', parts: [
      { text: '東', reading: 'ひがし', romaji: 'higashi', meaning: 'phía Đông', role: 'target' }, { text: '口', reading: 'ぐち', romaji: 'guchi', meaning: 'cửa / lối', role: 'support' }] },
    { word: '東', mean: 'phía Đông', target: '東', answer: 'ひがし', romaji: 'higashi', type: 'kun', wordReading: 'ひがし', wordRomaji: 'higashi', parts: [
      { text: '東', reading: 'ひがし', romaji: 'higashi', meaning: 'phía Đông', role: 'target' }] },
    // 四
    { word: '四月', mean: 'tháng Tư', target: '四', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'しがつ', wordRomaji: 'shigatsu', parts: [
      { text: '四', reading: 'し', romaji: 'shi', meaning: 'bốn', role: 'target' }, { text: '月', reading: 'がつ', romaji: 'gatsu', meaning: 'tháng', role: 'support' }] },
    { word: '四人', mean: 'bốn người', target: '四', answer: 'よ', romaji: 'yo', type: 'kun', wordReading: 'よにん', wordRomaji: 'yonin', parts: [
      { text: '四', reading: 'よ', romaji: 'yo', meaning: 'bốn', role: 'target' }, { text: '人', reading: 'にん', romaji: 'nin', meaning: 'người', role: 'support' }] },
    { word: '四つ', mean: 'bốn cái', target: '四', answer: 'よっ', romaji: 'yo', type: 'kun', wordReading: 'よっつ', wordRomaji: 'yottsu', parts: [
      { text: '四', reading: 'よっ', romaji: 'yo', meaning: 'bốn', role: 'target' }, { text: 'つ', reading: 'つ', romaji: 'tsu', meaning: 'trợ từ đếm', role: 'kana' }] },
    // 金
    { word: '金曜日', mean: 'thứ Sáu', target: '金', answer: 'きん', romaji: 'kin', type: 'on', wordReading: 'きんようび', wordRomaji: 'kinyoubi', parts: [
      { text: '金', reading: 'きん', romaji: 'kin', meaning: 'vàng / thứ Sáu', role: 'target' }, { text: '曜日', reading: 'ようび', romaji: 'youbi', meaning: 'ngày trong tuần', role: 'support' }] },
    { word: '金色', mean: 'màu vàng kim', target: '金', answer: 'きん', romaji: 'kin', type: 'on', wordReading: 'きんいろ', wordRomaji: 'kiniro', parts: [
      { text: '金', reading: 'きん', romaji: 'kin', meaning: 'vàng', role: 'target' }, { text: '色', reading: 'いろ', romaji: 'iro', meaning: 'màu', role: 'support' }] },
    { word: 'お金', mean: 'tiền', target: '金', answer: 'かね', romaji: 'kane', type: 'kun', wordReading: 'おかね', wordRomaji: 'okane', parts: [
      { text: 'お', reading: 'お', romaji: 'o', meaning: 'tiền tố lịch sự', role: 'kana' }, { text: '金', reading: 'かね', romaji: 'kane', meaning: 'tiền / vàng', role: 'target' }] },
    // 九
    { word: '九月', mean: 'tháng Chín', target: '九', answer: 'く', romaji: 'ku', type: 'on', wordReading: 'くがつ', wordRomaji: 'kugatsu', parts: [
      { text: '九', reading: 'く', romaji: 'ku', meaning: 'chín', role: 'target' }, { text: '月', reading: 'がつ', romaji: 'gatsu', meaning: 'tháng', role: 'support' }] },
    { word: '九人', mean: 'chín người', target: '九', answer: 'きゅう', romaji: 'kyuu', type: 'on', wordReading: 'きゅうにん', wordRomaji: 'kyuunin', parts: [
      { text: '九', reading: 'きゅう', romaji: 'kyuu', meaning: 'chín', role: 'target' }, { text: '人', reading: 'にん', romaji: 'nin', meaning: 'người', role: 'support' }] },
    { word: '九つ', mean: 'chín cái', target: '九', answer: 'ここの', romaji: 'kokono', type: 'kun', wordReading: 'ここのつ', wordRomaji: 'kokonotsu', parts: [
      { text: '九', reading: 'ここの', romaji: 'kokono', meaning: 'chín', role: 'target' }, { text: 'つ', reading: 'つ', romaji: 'tsu', meaning: 'trợ từ đếm', role: 'kana' }] },
    // 入
    { word: '入学', mean: 'nhập học', target: '入', answer: 'にゅう', romaji: 'nyuu', type: 'on', wordReading: 'にゅうがく', wordRomaji: 'nyuugaku', parts: [
      { text: '入', reading: 'にゅう', romaji: 'nyuu', meaning: 'nhập / vào', role: 'target' }, { text: '学', reading: 'がく', romaji: 'gaku', meaning: 'học', role: 'support' }] },
    { word: '入る', mean: 'đi vào', target: '入', answer: 'はい', romaji: 'hai', type: 'kun', wordReading: 'はいる', wordRomaji: 'hairu', parts: [
      { text: '入', reading: 'はい', romaji: 'hai', meaning: 'vào', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    { word: '入口', mean: 'lối vào', target: '入', answer: 'いり', romaji: 'iri', type: 'kun', wordReading: 'いりぐち', wordRomaji: 'iriguchi', parts: [
      { text: '入', reading: 'いり', romaji: 'iri', meaning: 'vào', role: 'target' }, { text: '口', reading: 'ぐち', romaji: 'guchi', meaning: 'cửa / lối', role: 'support' }] },
    // 学
    { word: '学生', mean: 'học sinh / sinh viên', target: '学', answer: 'がく', romaji: 'gaku', type: 'on', wordReading: 'がくせい', wordRomaji: 'gakusei', parts: [
      { text: '学', reading: 'がく', romaji: 'gaku', meaning: 'học', role: 'target' }, { text: '生', reading: 'せい', romaji: 'sei', meaning: 'sinh / người học', role: 'support' }] },
    { word: '学校', mean: 'trường học', target: '学', answer: 'がっ', romaji: 'ga', type: 'on', wordReading: 'がっこう', wordRomaji: 'gakkou', parts: [
      { text: '学', reading: 'がっ', romaji: 'ga', meaning: 'học', role: 'target' }, { text: '校', reading: 'こう', romaji: 'kou', meaning: 'trường', role: 'support' }] },
    { word: '学ぶ', mean: 'học hỏi', target: '学', answer: 'まな', romaji: 'mana', type: 'kun', wordReading: 'まなぶ', wordRomaji: 'manabu', parts: [
      { text: '学', reading: 'まな', romaji: 'mana', meaning: 'học', role: 'target' }, { text: 'ぶ', reading: 'ぶ', romaji: 'bu', meaning: '', role: 'kana' }] },
    // 高
    { word: '高校', mean: 'trường trung học phổ thông', target: '高', answer: 'こう', romaji: 'kou', type: 'on', wordReading: 'こうこう', wordRomaji: 'koukou', parts: [
      { text: '高', reading: 'こう', romaji: 'kou', meaning: 'cao', role: 'target' }, { text: '校', reading: 'こう', romaji: 'kou', meaning: 'trường', role: 'support' }] },
    { word: '高い', mean: 'cao / đắt', target: '高', answer: 'たか', romaji: 'taka', type: 'kun', wordReading: 'たかい', wordRomaji: 'takai', parts: [
      { text: '高', reading: 'たか', romaji: 'taka', meaning: 'cao / đắt', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    { word: '高さ', mean: 'độ cao', target: '高', answer: 'たか', romaji: 'taka', type: 'kun', wordReading: 'たかさ', wordRomaji: 'takasa', parts: [
      { text: '高', reading: 'たか', romaji: 'taka', meaning: 'cao', role: 'target' }, { text: 'さ', reading: 'さ', romaji: 'sa', meaning: 'hậu tố chỉ mức độ', role: 'kana' }] },
    // 円
    { word: '百円', mean: 'một trăm yên', target: '円', answer: 'えん', romaji: 'en', type: 'on', wordReading: 'ひゃくえん', wordRomaji: 'hyakuen', parts: [
      { text: '百', reading: 'ひゃく', romaji: 'hyaku', meaning: 'một trăm', role: 'support' }, { text: '円', reading: 'えん', romaji: 'en', meaning: 'yên', role: 'target' }] },
    { word: '一円', mean: 'một yên', target: '円', answer: 'えん', romaji: 'en', type: 'on', wordReading: 'いちえん', wordRomaji: 'ichien', parts: [
      { text: '一', reading: 'いち', romaji: 'ichi', meaning: 'một', role: 'support' }, { text: '円', reading: 'えん', romaji: 'en', meaning: 'yên', role: 'target' }] },
    { word: '円形', mean: 'hình tròn', target: '円', answer: 'えん', romaji: 'en', type: 'on', wordReading: 'えんけい', wordRomaji: 'enkei', parts: [
      { text: '円', reading: 'えん', romaji: 'en', meaning: 'tròn', role: 'target' }, { text: '形', reading: 'けい', romaji: 'kei', meaning: 'hình dạng', role: 'support' }] },
    // 子
    { word: '子供', mean: 'trẻ em', target: '子', answer: 'こ', romaji: 'ko', type: 'kun', wordReading: 'こども', wordRomaji: 'kodomo', parts: [
      { text: '子', reading: 'こ', romaji: 'ko', meaning: 'trẻ em', role: 'target' }, { text: '供', reading: 'ども', romaji: 'domo', meaning: 'nhóm / cùng', role: 'support' }] },
    { word: '女子', mean: 'nữ / nữ sinh', target: '子', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'じょし', wordRomaji: 'joshi', parts: [
      { text: '女', reading: 'じょ', romaji: 'jo', meaning: 'nữ', role: 'support' }, { text: '子', reading: 'し', romaji: 'shi', meaning: 'người con', role: 'target' }] },
    { word: '子犬', mean: 'chó con', target: '子', answer: 'こ', romaji: 'ko', type: 'kun', wordReading: 'こいぬ', wordRomaji: 'koinu', parts: [
      { text: '子', reading: 'こ', romaji: 'ko', meaning: 'con / nhỏ', role: 'target' }, { text: '犬', reading: 'いぬ', romaji: 'inu', meaning: 'chó', role: 'support' }] },
    // 外
    { word: '外国', mean: 'nước ngoài', target: '外', answer: 'がい', romaji: 'gai', type: 'on', wordReading: 'がいこく', wordRomaji: 'gaikoku', parts: [
      { text: '外', reading: 'がい', romaji: 'gai', meaning: 'ngoài', role: 'target' }, { text: '国', reading: 'こく', romaji: 'koku', meaning: 'quốc gia', role: 'support' }] },
    { word: '外出', mean: 'đi ra ngoài', target: '外', answer: 'がい', romaji: 'gai', type: 'on', wordReading: 'がいしゅつ', wordRomaji: 'gaishutsu', parts: [
      { text: '外', reading: 'がい', romaji: 'gai', meaning: 'ngoài', role: 'target' }, { text: '出', reading: 'しゅつ', romaji: 'shutsu', meaning: 'ra', role: 'support' }] },
    { word: '外', mean: 'bên ngoài', target: '外', answer: 'そと', romaji: 'soto', type: 'kun', wordReading: 'そと', wordRomaji: 'soto', parts: [
      { text: '外', reading: 'そと', romaji: 'soto', meaning: 'bên ngoài', role: 'target' }] },
    // 八
    { word: '八月', mean: 'tháng Tám', target: '八', answer: 'はち', romaji: 'hachi', type: 'on', wordReading: 'はちがつ', wordRomaji: 'hachigatsu', parts: [
      { text: '八', reading: 'はち', romaji: 'hachi', meaning: 'tám', role: 'target' }, { text: '月', reading: 'がつ', romaji: 'gatsu', meaning: 'tháng', role: 'support' }] },
    { word: '八人', mean: 'tám người', target: '八', answer: 'はち', romaji: 'hachi', type: 'on', wordReading: 'はちにん', wordRomaji: 'hachinin', parts: [
      { text: '八', reading: 'はち', romaji: 'hachi', meaning: 'tám', role: 'target' }, { text: '人', reading: 'にん', romaji: 'nin', meaning: 'người', role: 'support' }] },
    { word: '八つ', mean: 'tám cái', target: '八', answer: 'やっ', romaji: 'ya', type: 'kun', wordReading: 'やっつ', wordRomaji: 'yattsu', parts: [
      { text: '八', reading: 'やっ', romaji: 'ya', meaning: 'tám', role: 'target' }, { text: 'つ', reading: 'つ', romaji: 'tsu', meaning: 'trợ từ đếm', role: 'kana' }] },
    // 六
    { word: '六月', mean: 'tháng Sáu', target: '六', answer: 'ろく', romaji: 'roku', type: 'on', wordReading: 'ろくがつ', wordRomaji: 'rokugatsu', parts: [
      { text: '六', reading: 'ろく', romaji: 'roku', meaning: 'sáu', role: 'target' }, { text: '月', reading: 'がつ', romaji: 'gatsu', meaning: 'tháng', role: 'support' }] },
    { word: '六人', mean: 'sáu người', target: '六', answer: 'ろく', romaji: 'roku', type: 'on', wordReading: 'ろくにん', wordRomaji: 'rokunin', parts: [
      { text: '六', reading: 'ろく', romaji: 'roku', meaning: 'sáu', role: 'target' }, { text: '人', reading: 'にん', romaji: 'nin', meaning: 'người', role: 'support' }] },
    { word: '六つ', mean: 'sáu cái', target: '六', answer: 'むっ', romaji: 'mu', type: 'kun', wordReading: 'むっつ', wordRomaji: 'muttsu', parts: [
      { text: '六', reading: 'むっ', romaji: 'mu', meaning: 'sáu', role: 'target' }, { text: 'つ', reading: 'つ', romaji: 'tsu', meaning: 'trợ từ đếm', role: 'kana' }] },
    // 下
    { word: '地下', mean: 'dưới lòng đất / tầng hầm', target: '下', answer: 'か', romaji: 'ka', type: 'on', wordReading: 'ちか', wordRomaji: 'chika', parts: [
      { text: '地', reading: 'ち', romaji: 'chi', meaning: 'đất', role: 'support' }, { text: '下', reading: 'か', romaji: 'ka', meaning: 'dưới', role: 'target' }] },
    { word: '下手', mean: 'không giỏi / vụng', target: '下', answer: 'へ', romaji: 'he', type: 'kun', wordReading: 'へた', wordRomaji: 'heta', parts: [
      { text: '下', reading: 'へ', romaji: 'he', meaning: 'dưới / kém', role: 'target' }, { text: '手', reading: 'た', romaji: 'ta', meaning: 'tay / kỹ năng', role: 'support' }] },
    { word: '下', mean: 'phía dưới', target: '下', answer: 'した', romaji: 'shita', type: 'kun', wordReading: 'した', wordRomaji: 'shita', parts: [
      { text: '下', reading: 'した', romaji: 'shita', meaning: 'phía dưới', role: 'target' }] },
    // 来
    { word: '来年', mean: 'năm sau', target: '来', answer: 'らい', romaji: 'rai', type: 'on', wordReading: 'らいねん', wordRomaji: 'rainen', parts: [
      { text: '来', reading: 'らい', romaji: 'rai', meaning: 'sắp tới', role: 'target' }, { text: '年', reading: 'ねん', romaji: 'nen', meaning: 'năm', role: 'support' }] },
    { word: '来月', mean: 'tháng sau', target: '来', answer: 'らい', romaji: 'rai', type: 'on', wordReading: 'らいげつ', wordRomaji: 'raigetsu', parts: [
      { text: '来', reading: 'らい', romaji: 'rai', meaning: 'sắp tới', role: 'target' }, { text: '月', reading: 'げつ', romaji: 'getsu', meaning: 'tháng', role: 'support' }] },
    { word: '来る', mean: 'đến', target: '来', answer: 'く', romaji: 'ku', type: 'kun', wordReading: 'くる', wordRomaji: 'kuru', parts: [
      { text: '来', reading: 'く', romaji: 'ku', meaning: 'đến', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 気
    { word: '天気', mean: 'thời tiết', target: '気', answer: 'き', romaji: 'ki', type: 'on', wordReading: 'てんき', wordRomaji: 'tenki', parts: [
      { text: '天', reading: 'てん', romaji: 'ten', meaning: 'trời', role: 'support' }, { text: '気', reading: 'き', romaji: 'ki', meaning: 'khí', role: 'target' }] },
    { word: '元気', mean: 'khỏe mạnh / tràn đầy sức sống', target: '気', answer: 'き', romaji: 'ki', type: 'on', wordReading: 'げんき', wordRomaji: 'genki', parts: [
      { text: '元', reading: 'げん', romaji: 'gen', meaning: 'nguồn / gốc', role: 'support' }, { text: '気', reading: 'き', romaji: 'ki', meaning: 'tinh thần', role: 'target' }] },
    { word: '人気', mean: 'được yêu thích / nổi tiếng', target: '気', answer: 'き', romaji: 'ki', type: 'on', wordReading: 'にんき', wordRomaji: 'ninki', parts: [
      { text: '人', reading: 'にん', romaji: 'nin', meaning: 'người', role: 'support' }, { text: '気', reading: 'き', romaji: 'ki', meaning: 'sự chú ý', role: 'target' }] },
    // 小
    { word: '小学校', mean: 'trường tiểu học', target: '小', answer: 'しょう', romaji: 'shou', type: 'on', wordReading: 'しょうがっこう', wordRomaji: 'shougakkou', parts: [
      { text: '小', reading: 'しょう', romaji: 'shou', meaning: 'nhỏ / tiểu', role: 'target' }, { text: '学校', reading: 'がっこう', romaji: 'gakkou', meaning: 'trường học', role: 'support' }] },
    { word: '小さい', mean: 'nhỏ / bé', target: '小', answer: 'ちい', romaji: 'chii', type: 'kun', wordReading: 'ちいさい', wordRomaji: 'chiisai', parts: [
      { text: '小', reading: 'ちい', romaji: 'chii', meaning: 'nhỏ', role: 'target' }, { text: 'さい', reading: 'さい', romaji: 'sai', meaning: '', role: 'kana' }] },
    { word: '小川', mean: 'con suối nhỏ', target: '小', answer: 'お', romaji: 'o', type: 'kun', wordReading: 'おがわ', wordRomaji: 'ogawa', parts: [
      { text: '小', reading: 'お', romaji: 'o', meaning: 'nhỏ', role: 'target' }, { text: '川', reading: 'がわ', romaji: 'gawa', meaning: 'sông / suối', role: 'support' }] },
    // 七
    { word: '七月', mean: 'tháng Bảy', target: '七', answer: 'しち', romaji: 'shichi', type: 'on', wordReading: 'しちがつ', wordRomaji: 'shichigatsu', parts: [
      { text: '七', reading: 'しち', romaji: 'shichi', meaning: 'bảy', role: 'target' }, { text: '月', reading: 'がつ', romaji: 'gatsu', meaning: 'tháng', role: 'support' }] },
    { word: '七時', mean: 'bảy giờ', target: '七', answer: 'しち', romaji: 'shichi', type: 'on', wordReading: 'しちじ', wordRomaji: 'shichiji', parts: [
      { text: '七', reading: 'しち', romaji: 'shichi', meaning: 'bảy', role: 'target' }, { text: '時', reading: 'じ', romaji: 'ji', meaning: 'giờ', role: 'support' }] },
    { word: '七つ', mean: 'bảy cái', target: '七', answer: 'なな', romaji: 'nana', type: 'kun', wordReading: 'ななつ', wordRomaji: 'nanatsu', parts: [
      { text: '七', reading: 'なな', romaji: 'nana', meaning: 'bảy', role: 'target' }, { text: 'つ', reading: 'つ', romaji: 'tsu', meaning: 'trợ từ đếm', role: 'kana' }] },
    // 山
    { word: '火山', mean: 'núi lửa', target: '山', answer: 'ざん', romaji: 'zan', type: 'on', wordReading: 'かざん', wordRomaji: 'kazan', parts: [
      { text: '火', reading: 'か', romaji: 'ka', meaning: 'lửa', role: 'support' }, { text: '山', reading: 'ざん', romaji: 'zan', meaning: 'núi', role: 'target' }] },
    { word: '登山', mean: 'leo núi', target: '山', answer: 'ざん', romaji: 'zan', type: 'on', wordReading: 'とざん', wordRomaji: 'tozan', parts: [
      { text: '登', reading: 'と', romaji: 'to', meaning: 'leo', role: 'support' }, { text: '山', reading: 'ざん', romaji: 'zan', meaning: 'núi', role: 'target' }] },
    { word: '山', mean: 'núi', target: '山', answer: 'やま', romaji: 'yama', type: 'kun', wordReading: 'やま', wordRomaji: 'yama', parts: [
      { text: '山', reading: 'やま', romaji: 'yama', meaning: 'núi', role: 'target' }] },
    // 話
    { word: '会話', mean: 'hội thoại', target: '話', answer: 'わ', romaji: 'wa', type: 'on', wordReading: 'かいわ', wordRomaji: 'kaiwa', parts: [
      { text: '会', reading: 'かい', romaji: 'kai', meaning: 'gặp gỡ', role: 'support' }, { text: '話', reading: 'わ', romaji: 'wa', meaning: 'lời nói', role: 'target' }] },
    { word: '電話', mean: 'điện thoại', target: '話', answer: 'わ', romaji: 'wa', type: 'on', wordReading: 'でんわ', wordRomaji: 'denwa', parts: [
      { text: '電', reading: 'でん', romaji: 'den', meaning: 'điện', role: 'support' }, { text: '話', reading: 'わ', romaji: 'wa', meaning: 'nói chuyện', role: 'target' }] },
    { word: '話す', mean: 'nói chuyện', target: '話', answer: 'はな', romaji: 'hana', type: 'kun', wordReading: 'はなす', wordRomaji: 'hanasu', parts: [
      { text: '話', reading: 'はな', romaji: 'hana', meaning: 'nói', role: 'target' }, { text: 'す', reading: 'す', romaji: 'su', meaning: '', role: 'kana' }] },
    // 女
    { word: '女子', mean: 'nữ / nữ sinh', target: '女', answer: 'じょ', romaji: 'jo', type: 'on', wordReading: 'じょし', wordRomaji: 'joshi', parts: [
      { text: '女', reading: 'じょ', romaji: 'jo', meaning: 'nữ', role: 'target' }, { text: '子', reading: 'し', romaji: 'shi', meaning: 'người con', role: 'support' }] },
    { word: '女性', mean: 'phụ nữ / giới nữ', target: '女', answer: 'じょ', romaji: 'jo', type: 'on', wordReading: 'じょせい', wordRomaji: 'josei', parts: [
      { text: '女', reading: 'じょ', romaji: 'jo', meaning: 'nữ', role: 'target' }, { text: '性', reading: 'せい', romaji: 'sei', meaning: 'giới tính', role: 'support' }] },
    { word: '女', mean: 'người phụ nữ', target: '女', answer: 'おんな', romaji: 'onna', type: 'kun', wordReading: 'おんな', wordRomaji: 'onna', parts: [
      { text: '女', reading: 'おんな', romaji: 'onna', meaning: 'người phụ nữ', role: 'target' }] },
    // 北
    { word: '東北', mean: 'vùng Đông Bắc', target: '北', answer: 'ほく', romaji: 'hoku', type: 'on', wordReading: 'とうほく', wordRomaji: 'touhoku', parts: [
      { text: '東', reading: 'とう', romaji: 'tou', meaning: 'đông', role: 'support' }, { text: '北', reading: 'ほく', romaji: 'hoku', meaning: 'bắc', role: 'target' }] },
    { word: '北口', mean: 'cửa phía Bắc', target: '北', answer: 'きた', romaji: 'kita', type: 'kun', wordReading: 'きたぐち', wordRomaji: 'kitaguchi', parts: [
      { text: '北', reading: 'きた', romaji: 'kita', meaning: 'phía Bắc', role: 'target' }, { text: '口', reading: 'ぐち', romaji: 'guchi', meaning: 'cửa / lối', role: 'support' }] },
    { word: '北', mean: 'phía Bắc', target: '北', answer: 'きた', romaji: 'kita', type: 'kun', wordReading: 'きた', wordRomaji: 'kita', parts: [
      { text: '北', reading: 'きた', romaji: 'kita', meaning: 'phía Bắc', role: 'target' }] },
    // 午
    { word: '午前', mean: 'buổi sáng / trước trưa', target: '午', answer: 'ご', romaji: 'go', type: 'on', wordReading: 'ごぜん', wordRomaji: 'gozen', parts: [
      { text: '午', reading: 'ご', romaji: 'go', meaning: 'trưa', role: 'target' }, { text: '前', reading: 'ぜん', romaji: 'zen', meaning: 'trước', role: 'support' }] },
    { word: '午後', mean: 'buổi chiều / sau trưa', target: '午', answer: 'ご', romaji: 'go', type: 'on', wordReading: 'ごご', wordRomaji: 'gogo', parts: [
      { text: '午', reading: 'ご', romaji: 'go', meaning: 'trưa', role: 'target' }, { text: '後', reading: 'ご', romaji: 'go', meaning: 'sau', role: 'support' }] },
    { word: '正午', mean: 'đúng giữa trưa', target: '午', answer: 'ご', romaji: 'go', type: 'on', wordReading: 'しょうご', wordRomaji: 'shougo', parts: [
      { text: '正', reading: 'しょう', romaji: 'shou', meaning: 'đúng / chính', role: 'support' }, { text: '午', reading: 'ご', romaji: 'go', meaning: 'trưa', role: 'target' }] },
    // 百
    { word: '百円', mean: 'một trăm yên', target: '百', answer: 'ひゃく', romaji: 'hyaku', type: 'on', wordReading: 'ひゃくえん', wordRomaji: 'hyakuen', parts: [
      { text: '百', reading: 'ひゃく', romaji: 'hyaku', meaning: 'một trăm', role: 'target' }, { text: '円', reading: 'えん', romaji: 'en', meaning: 'yên', role: 'support' }] },
    { word: '三百', mean: 'ba trăm', target: '百', answer: 'びゃく', romaji: 'byaku', type: 'on', wordReading: 'さんびゃく', wordRomaji: 'sanbyaku', parts: [
      { text: '三', reading: 'さん', romaji: 'san', meaning: 'ba', role: 'support' }, { text: '百', reading: 'びゃく', romaji: 'byaku', meaning: 'trăm', role: 'target' }] },
    { word: '六百', mean: 'sáu trăm', target: '百', answer: 'ぴゃく', romaji: 'pyaku', type: 'on', wordReading: 'ろっぴゃく', wordRomaji: 'roppyaku', parts: [
      { text: '六', reading: 'ろっ', romaji: 'ro', meaning: 'sáu', role: 'support' }, { text: '百', reading: 'ぴゃく', romaji: 'pyaku', meaning: 'trăm', role: 'target' }] },
    // 書
    { word: '辞書', mean: 'từ điển', target: '書', answer: 'しょ', romaji: 'sho', type: 'on', wordReading: 'じしょ', wordRomaji: 'jisho', parts: [
      { text: '辞', reading: 'じ', romaji: 'ji', meaning: 'từ ngữ', role: 'support' }, { text: '書', reading: 'しょ', romaji: 'sho', meaning: 'sách', role: 'target' }] },
    { word: '図書館', mean: 'thư viện', target: '書', answer: 'しょ', romaji: 'sho', type: 'on', wordReading: 'としょかん', wordRomaji: 'toshokan', parts: [
      { text: '図', reading: 'と', romaji: 'to', meaning: 'bản đồ / hình', role: 'support' }, { text: '書', reading: 'しょ', romaji: 'sho', meaning: 'sách', role: 'target' }, { text: '館', reading: 'かん', romaji: 'kan', meaning: 'tòa nhà', role: 'support' }] },
    { word: '書く', mean: 'viết', target: '書', answer: 'か', romaji: 'ka', type: 'kun', wordReading: 'かく', wordRomaji: 'kaku', parts: [
      { text: '書', reading: 'か', romaji: 'ka', meaning: 'viết', role: 'target' }, { text: 'く', reading: 'く', romaji: 'ku', meaning: '', role: 'kana' }] },
    // 先
    { word: '先生', mean: 'giáo viên', target: '先', answer: 'せん', romaji: 'sen', type: 'on', wordReading: 'せんせい', wordRomaji: 'sensei', parts: [
      { text: '先', reading: 'せん', romaji: 'sen', meaning: 'trước', role: 'target' }, { text: '生', reading: 'せい', romaji: 'sei', meaning: 'sinh / người', role: 'support' }] },
    { word: '先月', mean: 'tháng trước', target: '先', answer: 'せん', romaji: 'sen', type: 'on', wordReading: 'せんげつ', wordRomaji: 'sengetsu', parts: [
      { text: '先', reading: 'せん', romaji: 'sen', meaning: 'trước', role: 'target' }, { text: '月', reading: 'げつ', romaji: 'getsu', meaning: 'tháng', role: 'support' }] },
    { word: '先', mean: 'phía trước / nơi đến trước', target: '先', answer: 'さき', romaji: 'saki', type: 'kun', wordReading: 'さき', wordRomaji: 'saki', parts: [
      { text: '先', reading: 'さき', romaji: 'saki', meaning: 'phía trước', role: 'target' }] },
    // 名
    { word: '名前', mean: 'tên', target: '名', answer: 'な', romaji: 'na', type: 'kun', wordReading: 'なまえ', wordRomaji: 'namae', parts: [
      { text: '名', reading: 'な', romaji: 'na', meaning: 'tên', role: 'target' }, { text: '前', reading: 'まえ', romaji: 'mae', meaning: 'phần sau của từ tên', role: 'support' }] },
    { word: '有名', mean: 'nổi tiếng', target: '名', answer: 'めい', romaji: 'mei', type: 'on', wordReading: 'ゆうめい', wordRomaji: 'yuumei', parts: [
      { text: '有', reading: 'ゆう', romaji: 'yuu', meaning: 'có', role: 'support' }, { text: '名', reading: 'めい', romaji: 'mei', meaning: 'danh tiếng', role: 'target' }] },
    { word: '名字', mean: 'họ', target: '名', answer: 'みょう', romaji: 'myou', type: 'on', wordReading: 'みょうじ', wordRomaji: 'myouji', parts: [
      { text: '名', reading: 'みょう', romaji: 'myou', meaning: 'tên', role: 'target' }, { text: '字', reading: 'じ', romaji: 'ji', meaning: 'chữ', role: 'support' }] },
    // 川
    { word: '小川', mean: 'con suối nhỏ', target: '川', answer: 'がわ', romaji: 'gawa', type: 'kun', wordReading: 'おがわ', wordRomaji: 'ogawa', parts: [
      { text: '小', reading: 'お', romaji: 'o', meaning: 'nhỏ', role: 'support' }, { text: '川', reading: 'がわ', romaji: 'gawa', meaning: 'sông / suối', role: 'target' }] },
    { word: '川上', mean: 'thượng nguồn', target: '川', answer: 'かわ', romaji: 'kawa', type: 'kun', wordReading: 'かわかみ', wordRomaji: 'kawakami', parts: [
      { text: '川', reading: 'かわ', romaji: 'kawa', meaning: 'sông', role: 'target' }, { text: '上', reading: 'かみ', romaji: 'kami', meaning: 'phía trên', role: 'support' }] },
    { word: '川', mean: 'sông', target: '川', answer: 'かわ', romaji: 'kawa', type: 'kun', wordReading: 'かわ', wordRomaji: 'kawa', parts: [
      { text: '川', reading: 'かわ', romaji: 'kawa', meaning: 'sông', role: 'target' }] },
    // 千
    { word: '千円', mean: 'một nghìn yên', target: '千', answer: 'せん', romaji: 'sen', type: 'on', wordReading: 'せんえん', wordRomaji: 'senen', parts: [
      { text: '千', reading: 'せん', romaji: 'sen', meaning: 'một nghìn', role: 'target' }, { text: '円', reading: 'えん', romaji: 'en', meaning: 'yên', role: 'support' }] },
    { word: '三千', mean: 'ba nghìn', target: '千', answer: 'ぜん', romaji: 'zen', type: 'on', wordReading: 'さんぜん', wordRomaji: 'sanzen', parts: [
      { text: '三', reading: 'さん', romaji: 'san', meaning: 'ba', role: 'support' }, { text: '千', reading: 'ぜん', romaji: 'zen', meaning: 'nghìn', role: 'target' }] },
    { word: '千葉', mean: 'Chiba', target: '千', answer: 'ち', romaji: 'chi', type: 'kun', wordReading: 'ちば', wordRomaji: 'chiba', parts: [
      { text: '千', reading: 'ち', romaji: 'chi', meaning: 'nghìn', role: 'target' }, { text: '葉', reading: 'ば', romaji: 'ba', meaning: 'lá', role: 'support' }] },
    // 水
    { word: '水曜日', mean: 'thứ Tư', target: '水', answer: 'すい', romaji: 'sui', type: 'on', wordReading: 'すいようび', wordRomaji: 'suiyoubi', parts: [
      { text: '水', reading: 'すい', romaji: 'sui', meaning: 'nước / thứ Tư', role: 'target' }, { text: '曜日', reading: 'ようび', romaji: 'youbi', meaning: 'ngày trong tuần', role: 'support' }] },
    { word: '水道', mean: 'nước máy / đường ống nước', target: '水', answer: 'すい', romaji: 'sui', type: 'on', wordReading: 'すいどう', wordRomaji: 'suidou', parts: [
      { text: '水', reading: 'すい', romaji: 'sui', meaning: 'nước', role: 'target' }, { text: '道', reading: 'どう', romaji: 'dou', meaning: 'đường / hệ thống', role: 'support' }] },
    { word: '水', mean: 'nước', target: '水', answer: 'みず', romaji: 'mizu', type: 'kun', wordReading: 'みず', wordRomaji: 'mizu', parts: [
      { text: '水', reading: 'みず', romaji: 'mizu', meaning: 'nước', role: 'target' }] },
    // 半
    { word: '半分', mean: 'một nửa', target: '半', answer: 'はん', romaji: 'han', type: 'on', wordReading: 'はんぶん', wordRomaji: 'hanbun', parts: [
      { text: '半', reading: 'はん', romaji: 'han', meaning: 'một nửa', role: 'target' }, { text: '分', reading: 'ぶん', romaji: 'bun', meaning: 'phần', role: 'support' }] },
    { word: '半年', mean: 'nửa năm', target: '半', answer: 'はん', romaji: 'han', type: 'on', wordReading: 'はんとし', wordRomaji: 'hantoshi', parts: [
      { text: '半', reading: 'はん', romaji: 'han', meaning: 'một nửa', role: 'target' }, { text: '年', reading: 'とし', romaji: 'toshi', meaning: 'năm', role: 'support' }] },
    { word: '半ば', mean: 'giữa chừng / một nửa', target: '半', answer: 'なか', romaji: 'naka', type: 'kun', wordReading: 'なかば', wordRomaji: 'nakaba', parts: [
      { text: '半', reading: 'なか', romaji: 'naka', meaning: 'nửa / giữa', role: 'target' }, { text: 'ば', reading: 'ば', romaji: 'ba', meaning: '', role: 'kana' }] },
    // 男
    { word: '男性', mean: 'nam giới', target: '男', answer: 'だん', romaji: 'dan', type: 'on', wordReading: 'だんせい', wordRomaji: 'dansei', parts: [
      { text: '男', reading: 'だん', romaji: 'dan', meaning: 'nam', role: 'target' }, { text: '性', reading: 'せい', romaji: 'sei', meaning: 'giới tính', role: 'support' }] },
    { word: '長男', mean: 'con trai trưởng', target: '男', answer: 'なん', romaji: 'nan', type: 'on', wordReading: 'ちょうなん', wordRomaji: 'chounan', parts: [
      { text: '長', reading: 'ちょう', romaji: 'chou', meaning: 'trưởng', role: 'support' }, { text: '男', reading: 'なん', romaji: 'nan', meaning: 'con trai', role: 'target' }] },
    { word: '男', mean: 'người đàn ông', target: '男', answer: 'おとこ', romaji: 'otoko', type: 'kun', wordReading: 'おとこ', wordRomaji: 'otoko', parts: [
      { text: '男', reading: 'おとこ', romaji: 'otoko', meaning: 'người đàn ông', role: 'target' }] },
    // 西
    { word: '西洋', mean: 'phương Tây', target: '西', answer: 'せい', romaji: 'sei', type: 'on', wordReading: 'せいよう', wordRomaji: 'seiyou', parts: [
      { text: '西', reading: 'せい', romaji: 'sei', meaning: 'Tây', role: 'target' }, { text: '洋', reading: 'よう', romaji: 'you', meaning: 'đại dương / phương Tây', role: 'support' }] },
    { word: '関西', mean: 'vùng Kansai', target: '西', answer: 'さい', romaji: 'sai', type: 'on', wordReading: 'かんさい', wordRomaji: 'kansai', parts: [
      { text: '関', reading: 'かん', romaji: 'kan', meaning: 'cửa ải / vùng', role: 'support' }, { text: '西', reading: 'さい', romaji: 'sai', meaning: 'Tây', role: 'target' }] },
    { word: '西', mean: 'phía Tây', target: '西', answer: 'にし', romaji: 'nishi', type: 'kun', wordReading: 'にし', wordRomaji: 'nishi', parts: [
      { text: '西', reading: 'にし', romaji: 'nishi', meaning: 'phía Tây', role: 'target' }] },
    // 電
    { word: '電話', mean: 'điện thoại', target: '電', answer: 'でん', romaji: 'den', type: 'on', wordReading: 'でんわ', wordRomaji: 'denwa', parts: [
      { text: '電', reading: 'でん', romaji: 'den', meaning: 'điện', role: 'target' }, { text: '話', reading: 'わ', romaji: 'wa', meaning: 'nói chuyện', role: 'support' }] },
    { word: '電車', mean: 'tàu điện', target: '電', answer: 'でん', romaji: 'den', type: 'on', wordReading: 'でんしゃ', wordRomaji: 'densha', parts: [
      { text: '電', reading: 'でん', romaji: 'den', meaning: 'điện', role: 'target' }, { text: '車', reading: 'しゃ', romaji: 'sha', meaning: 'xe', role: 'support' }] },
    { word: '電気', mean: 'điện / điện năng', target: '電', answer: 'でん', romaji: 'den', type: 'on', wordReading: 'でんき', wordRomaji: 'denki', parts: [
      { text: '電', reading: 'でん', romaji: 'den', meaning: 'điện', role: 'target' }, { text: '気', reading: 'き', romaji: 'ki', meaning: 'khí / năng lượng', role: 'support' }] },
    // 語
    { word: '日本語', mean: 'tiếng Nhật', target: '語', answer: 'ご', romaji: 'go', type: 'on', wordReading: 'にほんご', wordRomaji: 'nihongo', parts: [
      { text: '日本', reading: 'にほん', romaji: 'nihon', meaning: 'Nhật Bản', role: 'support' }, { text: '語', reading: 'ご', romaji: 'go', meaning: 'ngôn ngữ', role: 'target' }] },
    { word: '国語', mean: 'quốc ngữ / môn Văn', target: '語', answer: 'ご', romaji: 'go', type: 'on', wordReading: 'こくご', wordRomaji: 'kokugo', parts: [
      { text: '国', reading: 'こく', romaji: 'koku', meaning: 'quốc gia', role: 'support' }, { text: '語', reading: 'ご', romaji: 'go', meaning: 'ngôn ngữ', role: 'target' }] },
    { word: '語る', mean: 'kể / thuật lại', target: '語', answer: 'かた', romaji: 'kata', type: 'kun', wordReading: 'かたる', wordRomaji: 'kataru', parts: [
      { text: '語', reading: 'かた', romaji: 'kata', meaning: 'kể / nói', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 土
    { word: '土曜日', mean: 'thứ Bảy', target: '土', answer: 'ど', romaji: 'do', type: 'on', wordReading: 'どようび', wordRomaji: 'doyoubi', parts: [
      { text: '土', reading: 'ど', romaji: 'do', meaning: 'đất / thứ Bảy', role: 'target' }, { text: '曜日', reading: 'ようび', romaji: 'youbi', meaning: 'ngày trong tuần', role: 'support' }] },
    { word: '土地', mean: 'đất đai', target: '土', answer: 'と', romaji: 'to', type: 'on', wordReading: 'とち', wordRomaji: 'tochi', parts: [
      { text: '土', reading: 'と', romaji: 'to', meaning: 'đất', role: 'target' }, { text: '地', reading: 'ち', romaji: 'chi', meaning: 'mặt đất', role: 'support' }] },
    { word: '土', mean: 'đất', target: '土', answer: 'つち', romaji: 'tsuchi', type: 'kun', wordReading: 'つち', wordRomaji: 'tsuchi', parts: [
      { text: '土', reading: 'つち', romaji: 'tsuchi', meaning: 'đất', role: 'target' }] },
    // 木
    { word: '木曜日', mean: 'thứ Năm', target: '木', answer: 'もく', romaji: 'moku', type: 'on', wordReading: 'もくようび', wordRomaji: 'mokuyoubi', parts: [
      { text: '木', reading: 'もく', romaji: 'moku', meaning: 'cây / thứ Năm', role: 'target' }, { text: '曜日', reading: 'ようび', romaji: 'youbi', meaning: 'ngày trong tuần', role: 'support' }] },
    { word: '大木', mean: 'cây lớn', target: '木', answer: 'ぼく', romaji: 'boku', type: 'on', wordReading: 'たいぼく', wordRomaji: 'taiboku', parts: [
      { text: '大', reading: 'たい', romaji: 'tai', meaning: 'lớn', role: 'support' }, { text: '木', reading: 'ぼく', romaji: 'boku', meaning: 'cây', role: 'target' }] },
    { word: '木', mean: 'cây / gỗ', target: '木', answer: 'き', romaji: 'ki', type: 'kun', wordReading: 'き', wordRomaji: 'ki', parts: [
      { text: '木', reading: 'き', romaji: 'ki', meaning: 'cây / gỗ', role: 'target' }] },
    // 食
    { word: '食事', mean: 'bữa ăn', target: '食', answer: 'しょく', romaji: 'shoku', type: 'on', wordReading: 'しょくじ', wordRomaji: 'shokuji', parts: [
      { text: '食', reading: 'しょく', romaji: 'shoku', meaning: 'ăn', role: 'target' }, { text: '事', reading: 'じ', romaji: 'ji', meaning: 'việc', role: 'support' }] },
    { word: '食堂', mean: 'nhà ăn', target: '食', answer: 'しょく', romaji: 'shoku', type: 'on', wordReading: 'しょくどう', wordRomaji: 'shokudou', parts: [
      { text: '食', reading: 'しょく', romaji: 'shoku', meaning: 'ăn', role: 'target' }, { text: '堂', reading: 'どう', romaji: 'dou', meaning: 'sảnh / nhà', role: 'support' }] },
    { word: '食べる', mean: 'ăn', target: '食', answer: 'た', romaji: 'ta', type: 'kun', wordReading: 'たべる', wordRomaji: 'taberu', parts: [
      { text: '食', reading: 'た', romaji: 'ta', meaning: 'ăn', role: 'target' }, { text: 'べる', reading: 'べる', romaji: 'beru', meaning: '', role: 'kana' }] },
    // 車
    { word: '電車', mean: 'tàu điện', target: '車', answer: 'しゃ', romaji: 'sha', type: 'on', wordReading: 'でんしゃ', wordRomaji: 'densha', parts: [
      { text: '電', reading: 'でん', romaji: 'den', meaning: 'điện', role: 'support' }, { text: '車', reading: 'しゃ', romaji: 'sha', meaning: 'xe', role: 'target' }] },
    { word: '自転車', mean: 'xe đạp', target: '車', answer: 'しゃ', romaji: 'sha', type: 'on', wordReading: 'じてんしゃ', wordRomaji: 'jitensha', parts: [
      { text: '自転', reading: 'じてん', romaji: 'jiten', meaning: 'tự quay', role: 'support' }, { text: '車', reading: 'しゃ', romaji: 'sha', meaning: 'xe', role: 'target' }] },
    { word: '車', mean: 'xe', target: '車', answer: 'くるま', romaji: 'kuruma', type: 'kun', wordReading: 'くるま', wordRomaji: 'kuruma', parts: [
      { text: '車', reading: 'くるま', romaji: 'kuruma', meaning: 'xe', role: 'target' }] },
    // 南
    { word: '南米', mean: 'Nam Mỹ', target: '南', answer: 'なん', romaji: 'nan', type: 'on', wordReading: 'なんべい', wordRomaji: 'nanbei', parts: [
      { text: '南', reading: 'なん', romaji: 'nan', meaning: 'phía Nam', role: 'target' }, { text: '米', reading: 'べい', romaji: 'bei', meaning: 'Mỹ', role: 'support' }] },
    { word: '南口', mean: 'cửa phía Nam', target: '南', answer: 'みなみ', romaji: 'minami', type: 'kun', wordReading: 'みなみぐち', wordRomaji: 'minamiguchi', parts: [
      { text: '南', reading: 'みなみ', romaji: 'minami', meaning: 'phía Nam', role: 'target' }, { text: '口', reading: 'ぐち', romaji: 'guchi', meaning: 'cửa / lối', role: 'support' }] },
    { word: '南', mean: 'phía Nam', target: '南', answer: 'みなみ', romaji: 'minami', type: 'kun', wordReading: 'みなみ', wordRomaji: 'minami', parts: [
      { text: '南', reading: 'みなみ', romaji: 'minami', meaning: 'phía Nam', role: 'target' }] },
    // 何
    { word: '何人', mean: 'bao nhiêu người', target: '何', answer: 'なん', romaji: 'nan', type: 'kun', wordReading: 'なんにん', wordRomaji: 'nannin', parts: [
      { text: '何', reading: 'なん', romaji: 'nan', meaning: 'bao nhiêu', role: 'target' }, { text: '人', reading: 'にん', romaji: 'nin', meaning: 'người', role: 'support' }] },
    { word: '何時', mean: 'mấy giờ', target: '何', answer: 'なん', romaji: 'nan', type: 'kun', wordReading: 'なんじ', wordRomaji: 'nanji', parts: [
      { text: '何', reading: 'なん', romaji: 'nan', meaning: 'mấy', role: 'target' }, { text: '時', reading: 'じ', romaji: 'ji', meaning: 'giờ', role: 'support' }] },
    { word: '何', mean: 'cái gì', target: '何', answer: 'なに', romaji: 'nani', type: 'kun', wordReading: 'なに', wordRomaji: 'nani', parts: [
      { text: '何', reading: 'なに', romaji: 'nani', meaning: 'cái gì', role: 'target' }] },
    // 万
    { word: '一万円', mean: 'mười nghìn yên', target: '万', answer: 'まん', romaji: 'man', type: 'on', wordReading: 'いちまんえん', wordRomaji: 'ichimanen', parts: [
      { text: '一', reading: 'いち', romaji: 'ichi', meaning: 'một', role: 'support' }, { text: '万', reading: 'まん', romaji: 'man', meaning: 'mười nghìn', role: 'target' }, { text: '円', reading: 'えん', romaji: 'en', meaning: 'yên', role: 'support' }] },
    { word: '万人', mean: 'vạn người / mọi người', target: '万', answer: 'ばん', romaji: 'ban', type: 'on', wordReading: 'ばんにん', wordRomaji: 'bannin', parts: [
      { text: '万', reading: 'ばん', romaji: 'ban', meaning: 'vạn', role: 'target' }, { text: '人', reading: 'にん', romaji: 'nin', meaning: 'người', role: 'support' }] },
    { word: '万', mean: 'mười nghìn', target: '万', answer: 'まん', romaji: 'man', type: 'on', wordReading: 'まん', wordRomaji: 'man', parts: [
      { text: '万', reading: 'まん', romaji: 'man', meaning: 'mười nghìn', role: 'target' }] },
    // 校
    { word: '学校', mean: 'trường học', target: '校', answer: 'こう', romaji: 'kou', type: 'on', wordReading: 'がっこう', wordRomaji: 'gakkou', parts: [
      { text: '学', reading: 'がっ', romaji: 'ga', meaning: 'học', role: 'support' }, { text: '校', reading: 'こう', romaji: 'kou', meaning: 'trường', role: 'target' }] },
    { word: '高校', mean: 'trường trung học phổ thông', target: '校', answer: 'こう', romaji: 'kou', type: 'on', wordReading: 'こうこう', wordRomaji: 'koukou', parts: [
      { text: '高', reading: 'こう', romaji: 'kou', meaning: 'cao', role: 'support' }, { text: '校', reading: 'こう', romaji: 'kou', meaning: 'trường', role: 'target' }] },
    { word: '校長', mean: 'hiệu trưởng', target: '校', answer: 'こう', romaji: 'kou', type: 'on', wordReading: 'こうちょう', wordRomaji: 'kouchou', parts: [
      { text: '校', reading: 'こう', romaji: 'kou', meaning: 'trường', role: 'target' }, { text: '長', reading: 'ちょう', romaji: 'chou', meaning: 'trưởng', role: 'support' }] },
    // 毎
    { word: '毎日', mean: 'mỗi ngày', target: '毎', answer: 'まい', romaji: 'mai', type: 'on', wordReading: 'まいにち', wordRomaji: 'mainichi', parts: [
      { text: '毎', reading: 'まい', romaji: 'mai', meaning: 'mỗi', role: 'target' }, { text: '日', reading: 'にち', romaji: 'nichi', meaning: 'ngày', role: 'support' }] },
    { word: '毎年', mean: 'mỗi năm', target: '毎', answer: 'まい', romaji: 'mai', type: 'on', wordReading: 'まいねん', wordRomaji: 'mainen', parts: [
      { text: '毎', reading: 'まい', romaji: 'mai', meaning: 'mỗi', role: 'target' }, { text: '年', reading: 'ねん', romaji: 'nen', meaning: 'năm', role: 'support' }] },
    { word: '毎朝', mean: 'mỗi sáng', target: '毎', answer: 'まい', romaji: 'mai', type: 'on', wordReading: 'まいあさ', wordRomaji: 'maiasa', parts: [
      { text: '毎', reading: 'まい', romaji: 'mai', meaning: 'mỗi', role: 'target' }, { text: '朝', reading: 'あさ', romaji: 'asa', meaning: 'buổi sáng', role: 'support' }] },
    // 白
    { word: '白紙', mean: 'giấy trắng', target: '白', answer: 'はく', romaji: 'haku', type: 'on', wordReading: 'はくし', wordRomaji: 'hakushi', parts: [
      { text: '白', reading: 'はく', romaji: 'haku', meaning: 'trắng', role: 'target' }, { text: '紙', reading: 'し', romaji: 'shi', meaning: 'giấy', role: 'support' }] },
    { word: '白人', mean: 'người da trắng', target: '白', answer: 'はく', romaji: 'haku', type: 'on', wordReading: 'はくじん', wordRomaji: 'hakujin', parts: [
      { text: '白', reading: 'はく', romaji: 'haku', meaning: 'trắng', role: 'target' }, { text: '人', reading: 'じん', romaji: 'jin', meaning: 'người', role: 'support' }] },
    { word: '白い', mean: 'màu trắng', target: '白', answer: 'しろ', romaji: 'shiro', type: 'kun', wordReading: 'しろい', wordRomaji: 'shiroi', parts: [
      { text: '白', reading: 'しろ', romaji: 'shiro', meaning: 'trắng', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 天
    { word: '天気', mean: 'thời tiết', target: '天', answer: 'てん', romaji: 'ten', type: 'on', wordReading: 'てんき', wordRomaji: 'tenki', parts: [
      { text: '天', reading: 'てん', romaji: 'ten', meaning: 'trời', role: 'target' }, { text: '気', reading: 'き', romaji: 'ki', meaning: 'khí', role: 'support' }] },
    { word: '天国', mean: 'thiên đường', target: '天', answer: 'てん', romaji: 'ten', type: 'on', wordReading: 'てんごく', wordRomaji: 'tengoku', parts: [
      { text: '天', reading: 'てん', romaji: 'ten', meaning: 'trời', role: 'target' }, { text: '国', reading: 'ごく', romaji: 'goku', meaning: 'cõi / quốc gia', role: 'support' }] },
    { word: '天の川', mean: 'dải Ngân Hà', target: '天', answer: 'あま', romaji: 'ama', type: 'kun', wordReading: 'あまのがわ', wordRomaji: 'amanogawa', parts: [
      { text: '天', reading: 'あま', romaji: 'ama', meaning: 'trời', role: 'target' }, { text: 'の', reading: 'の', romaji: 'no', meaning: 'của', role: 'kana' }, { text: '川', reading: 'がわ', romaji: 'gawa', meaning: 'sông', role: 'support' }] },
    // 母
    { word: '母国', mean: 'quê hương / mẫu quốc', target: '母', answer: 'ぼ', romaji: 'bo', type: 'on', wordReading: 'ぼこく', wordRomaji: 'bokoku', parts: [
      { text: '母', reading: 'ぼ', romaji: 'bo', meaning: 'mẹ / gốc', role: 'target' }, { text: '国', reading: 'こく', romaji: 'koku', meaning: 'quốc gia', role: 'support' }] },
    { word: '母親', mean: 'người mẹ', target: '母', answer: 'はは', romaji: 'haha', type: 'kun', wordReading: 'ははおや', wordRomaji: 'hahaoya', parts: [
      { text: '母', reading: 'はは', romaji: 'haha', meaning: 'mẹ', role: 'target' }, { text: '親', reading: 'おや', romaji: 'oya', meaning: 'cha mẹ', role: 'support' }] },
    { word: 'お母さん', mean: 'mẹ (cách gọi lịch sự)', target: '母', answer: 'かあ', romaji: 'kaa', type: 'kun', wordReading: 'おかあさん', wordRomaji: 'okaasan', parts: [
      { text: 'お', reading: 'お', romaji: 'o', meaning: 'tiền tố lịch sự', role: 'kana' }, { text: '母', reading: 'かあ', romaji: 'kaa', meaning: 'mẹ', role: 'target' }, { text: 'さん', reading: 'さん', romaji: 'san', meaning: 'kính ngữ', role: 'kana' }] },
    // 火
    { word: '火曜日', mean: 'thứ Ba', target: '火', answer: 'か', romaji: 'ka', type: 'on', wordReading: 'かようび', wordRomaji: 'kayoubi', parts: [
      { text: '火', reading: 'か', romaji: 'ka', meaning: 'lửa / thứ Ba', role: 'target' }, { text: '曜日', reading: 'ようび', romaji: 'youbi', meaning: 'ngày trong tuần', role: 'support' }] },
    { word: '火山', mean: 'núi lửa', target: '火', answer: 'か', romaji: 'ka', type: 'on', wordReading: 'かざん', wordRomaji: 'kazan', parts: [
      { text: '火', reading: 'か', romaji: 'ka', meaning: 'lửa', role: 'target' }, { text: '山', reading: 'ざん', romaji: 'zan', meaning: 'núi', role: 'support' }] },
    { word: '火', mean: 'lửa', target: '火', answer: 'ひ', romaji: 'hi', type: 'kun', wordReading: 'ひ', wordRomaji: 'hi', parts: [
      { text: '火', reading: 'ひ', romaji: 'hi', meaning: 'lửa', role: 'target' }] },
    // 右
    { word: '右折', mean: 'rẽ phải', target: '右', answer: 'う', romaji: 'u', type: 'on', wordReading: 'うせつ', wordRomaji: 'usetsu', parts: [
      { text: '右', reading: 'う', romaji: 'u', meaning: 'phải', role: 'target' }, { text: '折', reading: 'せつ', romaji: 'setsu', meaning: 'rẽ / gập', role: 'support' }] },
    { word: '左右', mean: 'trái phải / hai bên', target: '右', answer: 'ゆう', romaji: 'yuu', type: 'on', wordReading: 'さゆう', wordRomaji: 'sayuu', parts: [
      { text: '左', reading: 'さ', romaji: 'sa', meaning: 'trái', role: 'support' }, { text: '右', reading: 'ゆう', romaji: 'yuu', meaning: 'phải', role: 'target' }] },
    { word: '右', mean: 'bên phải', target: '右', answer: 'みぎ', romaji: 'migi', type: 'kun', wordReading: 'みぎ', wordRomaji: 'migi', parts: [
      { text: '右', reading: 'みぎ', romaji: 'migi', meaning: 'bên phải', role: 'target' }] },
    // 読
    { word: '読書', mean: 'đọc sách', target: '読', answer: 'どく', romaji: 'doku', type: 'on', wordReading: 'どくしょ', wordRomaji: 'dokusho', parts: [
      { text: '読', reading: 'どく', romaji: 'doku', meaning: 'đọc', role: 'target' }, { text: '書', reading: 'しょ', romaji: 'sho', meaning: 'sách', role: 'support' }] },
    { word: '音読', mean: 'đọc thành tiếng', target: '読', answer: 'どく', romaji: 'doku', type: 'on', wordReading: 'おんどく', wordRomaji: 'ondoku', parts: [
      { text: '音', reading: 'おん', romaji: 'on', meaning: 'âm thanh', role: 'support' }, { text: '読', reading: 'どく', romaji: 'doku', meaning: 'đọc', role: 'target' }] },
    { word: '読む', mean: 'đọc', target: '読', answer: 'よ', romaji: 'yo', type: 'kun', wordReading: 'よむ', wordRomaji: 'yomu', parts: [
      { text: '読', reading: 'よ', romaji: 'yo', meaning: 'đọc', role: 'target' }, { text: 'む', reading: 'む', romaji: 'mu', meaning: '', role: 'kana' }] },
    // 友
    { word: '友人', mean: 'bạn bè / người bạn', target: '友', answer: 'ゆう', romaji: 'yuu', type: 'on', wordReading: 'ゆうじん', wordRomaji: 'yuujin', parts: [
      { text: '友', reading: 'ゆう', romaji: 'yuu', meaning: 'bạn', role: 'target' }, { text: '人', reading: 'じん', romaji: 'jin', meaning: 'người', role: 'support' }] },
    { word: '親友', mean: 'bạn thân', target: '友', answer: 'ゆう', romaji: 'yuu', type: 'on', wordReading: 'しんゆう', wordRomaji: 'shinyuu', parts: [
      { text: '親', reading: 'しん', romaji: 'shin', meaning: 'thân thiết', role: 'support' }, { text: '友', reading: 'ゆう', romaji: 'yuu', meaning: 'bạn', role: 'target' }] },
    { word: '友達', mean: 'bạn bè', target: '友', answer: 'とも', romaji: 'tomo', type: 'kun', wordReading: 'ともだち', wordRomaji: 'tomodachi', parts: [
      { text: '友', reading: 'とも', romaji: 'tomo', meaning: 'bạn', role: 'target' }, { text: '達', reading: 'だち', romaji: 'dachi', meaning: 'nhóm người', role: 'support' }] },
    // 左
    { word: '左右', mean: 'trái phải / hai bên', target: '左', answer: 'さ', romaji: 'sa', type: 'on', wordReading: 'さゆう', wordRomaji: 'sayuu', parts: [
      { text: '左', reading: 'さ', romaji: 'sa', meaning: 'trái', role: 'target' }, { text: '右', reading: 'ゆう', romaji: 'yuu', meaning: 'phải', role: 'support' }] },
    { word: '左折', mean: 'rẽ trái', target: '左', answer: 'さ', romaji: 'sa', type: 'on', wordReading: 'させつ', wordRomaji: 'sasetsu', parts: [
      { text: '左', reading: 'さ', romaji: 'sa', meaning: 'trái', role: 'target' }, { text: '折', reading: 'せつ', romaji: 'setsu', meaning: 'rẽ / gập', role: 'support' }] },
    { word: '左', mean: 'bên trái', target: '左', answer: 'ひだり', romaji: 'hidari', type: 'kun', wordReading: 'ひだり', wordRomaji: 'hidari', parts: [
      { text: '左', reading: 'ひだり', romaji: 'hidari', meaning: 'bên trái', role: 'target' }] },
    // 休
    { word: '休日', mean: 'ngày nghỉ', target: '休', answer: 'きゅう', romaji: 'kyuu', type: 'on', wordReading: 'きゅうじつ', wordRomaji: 'kyuujitsu', parts: [
      { text: '休', reading: 'きゅう', romaji: 'kyuu', meaning: 'nghỉ', role: 'target' }, { text: '日', reading: 'じつ', romaji: 'jitsu', meaning: 'ngày', role: 'support' }] },
    { word: '休校', mean: 'trường nghỉ học', target: '休', answer: 'きゅう', romaji: 'kyuu', type: 'on', wordReading: 'きゅうこう', wordRomaji: 'kyuukou', parts: [
      { text: '休', reading: 'きゅう', romaji: 'kyuu', meaning: 'nghỉ', role: 'target' }, { text: '校', reading: 'こう', romaji: 'kou', meaning: 'trường', role: 'support' }] },
    { word: '休む', mean: 'nghỉ ngơi', target: '休', answer: 'やす', romaji: 'yasu', type: 'kun', wordReading: 'やすむ', wordRomaji: 'yasumu', parts: [
      { text: '休', reading: 'やす', romaji: 'yasu', meaning: 'nghỉ', role: 'target' }, { text: 'む', reading: 'む', romaji: 'mu', meaning: '', role: 'kana' }] },
    // 父
    { word: '父母', mean: 'cha mẹ', target: '父', answer: 'ふ', romaji: 'fu', type: 'on', wordReading: 'ふぼ', wordRomaji: 'fubo', parts: [
      { text: '父', reading: 'ふ', romaji: 'fu', meaning: 'cha', role: 'target' }, { text: '母', reading: 'ぼ', romaji: 'bo', meaning: 'mẹ', role: 'support' }] },
    { word: '父', mean: 'cha / bố của mình', target: '父', answer: 'ちち', romaji: 'chichi', type: 'kun', wordReading: 'ちち', wordRomaji: 'chichi', parts: [
      { text: '父', reading: 'ちち', romaji: 'chichi', meaning: 'cha / bố', role: 'target' }] },
    { word: 'お父さん', mean: 'bố (cách gọi lịch sự)', target: '父', answer: 'とう', romaji: 'tou', type: 'kun', wordReading: 'おとうさん', wordRomaji: 'otousan', parts: [
      { text: 'お', reading: 'お', romaji: 'o', meaning: 'tiền tố lịch sự', role: 'kana' }, { text: '父', reading: 'とう', romaji: 'tou', meaning: 'bố', role: 'target' }, { text: 'さん', reading: 'さん', romaji: 'san', meaning: 'kính ngữ', role: 'kana' }] },
    // 雨
    { word: '雨天', mean: 'trời mưa / thời tiết mưa', target: '雨', answer: 'う', romaji: 'u', type: 'on', wordReading: 'うてん', wordRomaji: 'uten', parts: [
      { text: '雨', reading: 'う', romaji: 'u', meaning: 'mưa', role: 'target' }, { text: '天', reading: 'てん', romaji: 'ten', meaning: 'trời', role: 'support' }] },
    { word: '大雨', mean: 'mưa lớn', target: '雨', answer: 'あめ', romaji: 'ame', type: 'kun', wordReading: 'おおあめ', wordRomaji: 'ooame', parts: [
      { text: '大', reading: 'おお', romaji: 'oo', meaning: 'lớn', role: 'support' }, { text: '雨', reading: 'あめ', romaji: 'ame', meaning: 'mưa', role: 'target' }] },
    { word: '雨具', mean: 'đồ đi mưa', target: '雨', answer: 'あま', romaji: 'ama', type: 'kun', wordReading: 'あまぐ', wordRomaji: 'amagu', parts: [
      { text: '雨', reading: 'あま', romaji: 'ama', meaning: 'mưa', role: 'target' }, { text: '具', reading: 'ぐ', romaji: 'gu', meaning: 'dụng cụ', role: 'support' }] },
    // 悪
    { word: '悪意', mean: 'ác ý', target: '悪', answer: 'あく', romaji: 'aku', type: 'on', wordReading: 'あくい', wordRomaji: 'akui', parts: [
      { text: '悪', reading: 'あく', romaji: 'aku', meaning: 'xấu / ác', role: 'target' }, { text: '意', reading: 'い', romaji: 'i', meaning: 'ý định', role: 'support' }] },
    { word: '最悪', mean: 'tệ nhất', target: '悪', answer: 'あく', romaji: 'aku', type: 'on', wordReading: 'さいあく', wordRomaji: 'saiaku', parts: [
      { text: '最', reading: 'さい', romaji: 'sai', meaning: 'nhất', role: 'support' }, { text: '悪', reading: 'あく', romaji: 'aku', meaning: 'xấu / tệ', role: 'target' }] },
    { word: '悪い', mean: 'xấu / tệ', target: '悪', answer: 'わる', romaji: 'waru', type: 'kun', wordReading: 'わるい', wordRomaji: 'warui', parts: [
      { text: '悪', reading: 'わる', romaji: 'waru', meaning: 'xấu', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 暗
    { word: '暗記', mean: 'học thuộc lòng', target: '暗', answer: 'あん', romaji: 'an', type: 'on', wordReading: 'あんき', wordRomaji: 'anki', parts: [
      { text: '暗', reading: 'あん', romaji: 'an', meaning: 'ghi nhớ thầm', role: 'target' }, { text: '記', reading: 'き', romaji: 'ki', meaning: 'ghi nhớ', role: 'support' }] },
    { word: '暗室', mean: 'phòng tối', target: '暗', answer: 'あん', romaji: 'an', type: 'on', wordReading: 'あんしつ', wordRomaji: 'anshitsu', parts: [
      { text: '暗', reading: 'あん', romaji: 'an', meaning: 'tối', role: 'target' }, { text: '室', reading: 'しつ', romaji: 'shitsu', meaning: 'phòng', role: 'support' }] },
    { word: '暗い', mean: 'tối', target: '暗', answer: 'くら', romaji: 'kura', type: 'kun', wordReading: 'くらい', wordRomaji: 'kurai', parts: [
      { text: '暗', reading: 'くら', romaji: 'kura', meaning: 'tối', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 医
    { word: '医者', mean: 'bác sĩ', target: '医', answer: 'い', romaji: 'i', type: 'on', wordReading: 'いしゃ', wordRomaji: 'isha', parts: [
      { text: '医', reading: 'い', romaji: 'i', meaning: 'y học', role: 'target' }, { text: '者', reading: 'しゃ', romaji: 'sha', meaning: 'người', role: 'support' }] },
    { word: '医学', mean: 'y học', target: '医', answer: 'い', romaji: 'i', type: 'on', wordReading: 'いがく', wordRomaji: 'igaku', parts: [
      { text: '医', reading: 'い', romaji: 'i', meaning: 'y khoa', role: 'target' }, { text: '学', reading: 'がく', romaji: 'gaku', meaning: 'học', role: 'support' }] },
    { word: '医院', mean: 'phòng khám', target: '医', answer: 'い', romaji: 'i', type: 'on', wordReading: 'いいん', wordRomaji: 'iin', parts: [
      { text: '医', reading: 'い', romaji: 'i', meaning: 'y tế', role: 'target' }, { text: '院', reading: 'いん', romaji: 'in', meaning: 'viện', role: 'support' }] },
    // 意
    { word: '意味', mean: 'ý nghĩa', target: '意', answer: 'い', romaji: 'i', type: 'on', wordReading: 'いみ', wordRomaji: 'imi', parts: [
      { text: '意', reading: 'い', romaji: 'i', meaning: 'ý', role: 'target' }, { text: '味', reading: 'み', romaji: 'mi', meaning: 'vị / nghĩa', role: 'support' }] },
    { word: '意見', mean: 'ý kiến', target: '意', answer: 'い', romaji: 'i', type: 'on', wordReading: 'いけん', wordRomaji: 'iken', parts: [
      { text: '意', reading: 'い', romaji: 'i', meaning: 'ý', role: 'target' }, { text: '見', reading: 'けん', romaji: 'ken', meaning: 'cách nhìn', role: 'support' }] },
    { word: '意外', mean: 'ngoài dự đoán / bất ngờ', target: '意', answer: 'い', romaji: 'i', type: 'on', wordReading: 'いがい', wordRomaji: 'igai', parts: [
      { text: '意', reading: 'い', romaji: 'i', meaning: 'ý nghĩ', role: 'target' }, { text: '外', reading: 'がい', romaji: 'gai', meaning: 'ngoài', role: 'support' }] },
  ],

  // Kho đáp án nhiễu (distractor) — cách đọc kana thường gặp
  DISTRACTORS: ['おん', 'おと', 'にち', 'ひ', 'か', 'こく', 'くに', 'ねん', 'とし',
    'だい', 'たい', 'おお', 'ぎょ', 'さかな', 'うお', 'いち', 'いつ', 'じん', 'にん', 'ひと', 'じゅう', 'とお', 'に', 'ふた',
    'ほん', 'もと', 'ちゅう', 'なか', 'ちょう', 'なが',
    'しゅつ', 'しゅっ', 'で', 'だ', 'さん', 'み', 'みっ', 'じ', 'とき',
    'こう', 'ぎょう', 'い', 'ゆ', 'けん', 'こん', 'きん', 'いま', 'げつ', 'がつ', 'つき', 'ぶん', 'ふん', 'ぷん', 'わ',
    'ご', 'あと', 'うし', 'のち', 'ぜん', 'まえ', 'せい', 'しょう', 'う', 'なま', 'いつ', 'かん', 'げん', 'あいだ', 'ま',
    'じょう', 'あ', 'うえ', 'うわ', 'とう', 'ひがし', 'し', 'よん', 'よ', 'よっ', 'かね', 'く', 'きゅう', 'ここの',
    'にゅう', 'はい', 'いり', 'がく', 'がっ', 'まな', 'たか', 'えん', 'まる', 'こ', 'す',
    'がい', 'げ', 'そと', 'ほか', 'はち', 'や', 'やっ', 'ろく', 'む', 'むっ', 'した', 'さ', 'くだ', 'へ',
    'らい', 'き', 'け', 'しょう', 'ちい', 'お', 'しち', 'なな', 'なの', 'ざん', 'やま', 'はな', 'はなし',
    'じょ', 'にょ', 'おんな', 'め', 'ほく', 'きた', 'ひゃく', 'びゃく', 'ぴゃく', 'もも', 'しょ', 'せん', 'さき',
    'めい', 'みょう', 'な', 'かわ', 'がわ', 'ぜん', 'ち', 'みず', 'はん', 'だん', 'なん', 'おとこ', 'さい', 'にし',
    'でん', 'かた', 'ど', 'と', 'つち', 'もく', 'ぼく', 'き', 'しょく', 'じき', 'た', 'しゃ', 'くるま', 'みなみ',
    'げつ', 'すい', 'もく', 'きん', 'ど', 'よう', 'せい', 'がく',
    'なに', 'なん', 'まん', 'ばん', 'まい', 'はく', 'しろ', 'しら', 'てん', 'あめ', 'あま', 'ぼ', 'はは', 'かあ', 'ひ', 'ほ', 'う', 'ゆう', 'みぎ', 'どく', 'とく', 'よ',
    'とも', 'さ', 'ひだり', 'きゅう', 'やす', 'ふ', 'ちち', 'とう', 'あく', 'わる', 'あん', 'くら'],
};
