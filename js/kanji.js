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
//   QUESTIONS  = { id?, word, mean, target, answer, romaji, type, wordReading, wordRomaji,
//                  parts[], sentence?, sentenceReading?, sentenceMeaning? }
//   id          = stable vocabulary id. Nếu bỏ trống, data-loader tạo id deterministic.
//   parts[]     = { text, reading, romaji, meaning, role('target'|'support'|'kana') }
//   sentence*   = ngữ cảnh tự nhiên tùy chọn; engine tự sinh fallback nếu bỏ trống.
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
    i_by:{ char: '以', meaning: 'Từ / Bằng / Trở lên', on: ['イ (i)'], kun: [], monId: 'i_by', jlpt: 'N4' },
    hiku:{ char: '引', meaning: 'Kéo / Dẫn', on: ['イン (in)'], kun: ['ひ (hi)'], monId: 'hiku', jlpt: 'N4' },
    institute:{ char: '院', meaning: 'Viện / Cơ sở', on: ['イン (in)'], kun: [], monId: 'institute', jlpt: 'N4' },
    member:{ char: '員', meaning: 'Thành viên / Nhân viên', on: ['イン (in)'], kun: [], monId: 'member', jlpt: 'N4' },
    un:{ char: '運', meaning: 'Vận chuyển / Vận may', on: ['ウン (un)'], kun: ['はこ (hako)'], monId: 'un', jlpt: 'N4' },
    ei:{ char: '英', meaning: 'Anh / Xuất sắc', on: ['エイ (ei)'], kun: [], monId: 'ei', jlpt: 'N4' },
    utsu:{ char: '映', meaning: 'Chiếu / Phản chiếu', on: ['エイ (ei)'], kun: ['うつ (utsu)', 'は (ha)'], monId: 'utsu', jlpt: 'N4' },
    tooi:{ char: '遠', meaning: 'Xa / Viễn', on: ['エン (en)'], kun: ['とお (too)'], monId: 'tooi', jlpt: 'N4' },
    ya:{ char: '屋', meaning: 'Nhà / Cửa hàng', on: ['オク (oku)'], kun: ['や (ya)'], monId: 'ya', jlpt: 'N4' },
    uta:{ char: '歌', meaning: 'Bài hát / Hát', on: ['カ (ka)'], kun: ['うた (uta)'], monId: 'uta', jlpt: 'N4' },
    natsu:{ char: '夏', meaning: 'Mùa hè', on: ['カ (ka)'], kun: ['なつ (natsu)'], monId: 'natsu', jlpt: 'N4' },
    ie:{ char: '家', meaning: 'Nhà / Gia đình', on: ['カ (ka)', 'ケ (ke)'], kun: ['いえ (ie)', 'や (ya)'], monId: 'ie', jlpt: 'N4' },
    ga_art:{ char: '画', meaning: 'Tranh / Hình / Nét', on: ['ガ (ga)', 'カク (kaku)'], kun: [], monId: 'ga_art', jlpt: 'N4' },
    umi:{ char: '海', meaning: 'Biển / Hải', on: ['カイ (kai)'], kun: ['うみ (umi)'], monId: 'umi', jlpt: 'N4' },
    kai_turn:{ char: '回', meaning: 'Lần / Xoay vòng', on: ['カイ (kai)'], kun: ['まわ (mawa)'], monId: 'kai_turn', jlpt: 'N4' },
    hiraku:{ char: '開', meaning: 'Mở / Khai', on: ['カイ (kai)'], kun: ['ひら (hira)', 'あ (a)'], monId: 'hiraku', jlpt: 'N4' },
    kai_world:{ char: '界', meaning: 'Thế giới / Ranh giới', on: ['カイ (kai)'], kun: ['さかい (sakai)'], monId: 'kai_world', jlpt: 'N4' },
    tanoshi:{ char: '楽', meaning: 'Vui / Âm nhạc', on: ['ガク (gaku)', 'ラク (raku)'], kun: ['たの (tano)'], monId: 'tanoshi', jlpt: 'N4' },
    kan_building:{ char: '館', meaning: 'Tòa nhà / Quán', on: ['カン (kan)'], kun: ['やかた (yakata)'], monId: 'kan_building', jlpt: 'N4' },
    kan_han:{ char: '漢', meaning: 'Hán / Chữ Hán', on: ['カン (kan)'], kun: [], monId: 'kan_han', jlpt: 'N4' },
    samui:{ char: '寒', meaning: 'Lạnh / Hàn', on: ['カン (kan)'], kun: ['さむ (samu)'], monId: 'samui', jlpt: 'N4' },
    kao:{ char: '顔', meaning: 'Khuôn mặt', on: ['ガン (gan)'], kun: ['かお (kao)'], monId: 'kao', jlpt: 'N4' },
    kaeru:{ char: '帰', meaning: 'Trở về / Quy', on: ['キ (ki)'], kun: ['かえ (kae)'], monId: 'kaeru', jlpt: 'N4' },
    okiru:{ char: '起', meaning: 'Dậy / Khởi', on: ['キ (ki)'], kun: ['お (o)'], monId: 'okiru', jlpt: 'N4' },
    kyuu_research:{ char: '究', meaning: 'Nghiên cứu / Cùng', on: ['キュウ (kyuu)'], kun: ['きわ (kiwa)'], monId: 'kyuu_research', jlpt: 'N4' },
    isogu:{ char: '急', meaning: 'Gấp / Khẩn cấp', on: ['キュウ (kyuu)'], kun: ['いそ (iso)'], monId: 'isogu', jlpt: 'N4' },
    ushi:{ char: '牛', meaning: 'Bò / Ngưu', on: ['ギュウ (gyuu)'], kun: ['うし (ushi)'], monId: 'ushi', jlpt: 'N4' },
    saru:{ char: '去', meaning: 'Rời đi / Quá khứ', on: ['キョ (kyo)', 'コ (ko)'], kun: ['さ (sa)'], monId: 'saru', jlpt: 'N4' },
    tsuyoi:{ char: '強', meaning: 'Mạnh / Cường', on: ['キョウ (kyou)', 'ゴウ (gou)'], kun: ['つよ (tsuyo)', 'し (shi)'], monId: 'tsuyoi', jlpt: 'N4' },
    oshieru:{ char: '教', meaning: 'Dạy / Giáo', on: ['キョウ (kyou)'], kun: ['おし (oshi)', 'おそ (oso)'], monId: 'oshieru', jlpt: 'N4' },
    kyou_capital:{ char: '京', meaning: 'Kinh đô / Thủ đô', on: ['キョウ (kyou)', 'ケイ (kei)', 'キン (kin)'], kun: ['みやこ (miyako)'], monId: 'kyou_capital', jlpt: 'N4' },
    gyou_business:{ char: '業', meaning: 'Nghiệp / Công việc', on: ['ギョウ (gyou)', 'ゴウ (gou)'], kun: ['わざ (waza)'], monId: 'gyou_business', jlpt: 'N4' },
    chikai:{ char: '近', meaning: 'Gần / Cận', on: ['キン (kin)'], kun: ['ちか (chika)'], monId: 'chikai', jlpt: 'N4' },
    gin:{ char: '銀', meaning: 'Bạc / Ngân', on: ['ギン (gin)'], kun: ['しろがね (shirogane)'], monId: 'gin', jlpt: 'N4' },
    ku_district:{ char: '区', meaning: 'Khu / Quận', on: ['ク (ku)'], kun: [], monId: 'ku_district', jlpt: 'N4' },
    hakaru:{ char: '計', meaning: 'Tính / Đo lường', on: ['ケイ (kei)'], kun: ['はか (haka)'], monId: 'hakaru', jlpt: 'N4' },
    ani:{ char: '兄', meaning: 'Anh trai', on: ['ケイ (kei)', 'キョウ (kyou)'], kun: ['あに (ani)'], monId: 'ani', jlpt: 'N4' },
    karui:{ char: '軽', meaning: 'Nhẹ / Khinh', on: ['ケイ (kei)'], kun: ['かる (karu)'], monId: 'karui', jlpt: 'N4' },
    inu:{ char: '犬', meaning: 'Chó / Khuyển', on: ['ケン (ken)'], kun: ['いぬ (inu)'], monId: 'inu', jlpt: 'N4' },
    ken_research:{ char: '研', meaning: 'Nghiên cứu / Mài', on: ['ケン (ken)'], kun: ['と (to)'], monId: 'ken_research', jlpt: 'N4' },
    ken_prefecture:{ char: '県', meaning: 'Tỉnh / Huyện', on: ['ケン (ken)'], kun: [], monId: 'ken_prefecture', jlpt: 'N4' },
    tateru:{ char: '建', meaning: 'Xây dựng / Kiến', on: ['ケン (ken)', 'コン (kon)'], kun: ['た (ta)'], monId: 'tateru', jlpt: 'N4' },
    ken_test:{ char: '験', meaning: 'Kiểm tra / Trải nghiệm', on: ['ケン (ken)', 'ゲン (gen)'], kun: [], monId: 'ken_test', jlpt: 'N4' },
    moto:{ char: '元', meaning: 'Gốc / Nguyên', on: ['ゲン (gen)', 'ガン (gan)'], kun: ['もと (moto)'], monId: 'moto', jlpt: 'N4' },
    kou_craft:{ char: '工', meaning: 'Công / Chế tác', on: ['コウ (kou)', 'ク (ku)', 'グ (gu)'], kun: [], monId: 'kou_craft', jlpt: 'N4' },
    hiroi:{ char: '広', meaning: 'Rộng / Quảng', on: ['コウ (kou)'], kun: ['ひろ (hiro)'], monId: 'hiroi', jlpt: 'N4' },
    kangaeru:{ char: '考', meaning: 'Suy nghĩ / Khảo', on: ['コウ (kou)'], kun: ['かんが (kanga)'], monId: 'kangaeru', jlpt: 'N4' },
    hikari:{ char: '光', meaning: 'Ánh sáng / Quang', on: ['コウ (kou)'], kun: ['ひかり (hikari)', 'ひか (hika)'], monId: 'hikari', jlpt: 'N4' },
    suki:{ char: '好', meaning: 'Thích / Hảo', on: ['コウ (kou)'], kun: ['この (kono)', 'す (su)'], monId: 'suki', jlpt: 'N4' },
    au:{ char: '合', meaning: 'Hợp / Gặp / Ghép', on: ['ゴウ (gou)', 'ガッ (ga)', 'カッ (ka)'], kun: ['あ (a)'], monId: 'au', jlpt: 'N4' },
    kuro:{ char: '黒', meaning: 'Đen / Hắc', on: ['コク (koku)'], kun: ['くろ (kuro)'], monId: 'kuro', jlpt: 'N4' },
    na_vegetable:{ char: '菜', meaning: 'Rau / Thái', on: ['サイ (sai)'], kun: ['な (na)'], monId: 'na_vegetable', jlpt: 'N4' },
    tsukuru:{ char: '作', meaning: 'Làm / Tạo', on: ['サク (saku)', 'サ (sa)'], kun: ['つく (tsuku)'], monId: 'tsukuru', jlpt: 'N4' },
    umu:{ char: '産', meaning: 'Sinh / Sản xuất', on: ['サン (san)'], kun: ['う (u)', 'うぶ (ubu)'], monId: 'umu', jlpt: 'N4' },
    kami_paper:{ char: '紙', meaning: 'Giấy', on: ['シ (shi)'], kun: ['かみ (kami)'], monId: 'kami_paper', jlpt: 'N4' },
    omou:{ char: '思', meaning: 'Nghĩ / Tư', on: ['シ (shi)'], kun: ['おも (omo)'], monId: 'omou', jlpt: 'N4' },
    ane:{ char: '姉', meaning: 'Chị gái', on: ['シ (shi)'], kun: ['あね (ane)'], monId: 'ane', jlpt: 'N4' },
    tomaru:{ char: '止', meaning: 'Dừng / Chỉ', on: ['シ (shi)'], kun: ['と (to)', 'とど (todo)', 'や (ya)'], monId: 'tomaru', jlpt: 'N4' },
    shi_city:{ char: '市', meaning: 'Thành phố / Chợ', on: ['シ (shi)'], kun: ['いち (ichi)'], monId: 'shi_city', jlpt: 'N4' },
    shi_work:{ char: '仕', meaning: 'Làm việc / Phụng sự', on: ['シ (shi)', 'ジ (ji)'], kun: ['つか (tsuka)'], monId: 'shi_work', jlpt: 'N4' },
    shi_death:{ char: '死', meaning: 'Chết / Tử', on: ['シ (shi)'], kun: ['し (shi)'], monId: 'shi_death', jlpt: 'N4' },
    tsukau:{ char: '使', meaning: 'Dùng / Sử', on: ['シ (shi)'], kun: ['つか (tsuka)'], monId: 'tsukau', jlpt: 'N4' },
    hajimeru:{ char: '始', meaning: 'Bắt đầu / Thủy', on: ['シ (shi)'], kun: ['はじ (haji)'], monId: 'hajimeru', jlpt: 'N4' },
    shi_try:{ char: '試', meaning: 'Thử / Thi', on: ['シ (shi)'], kun: ['こころ (kokoro)', 'ため (tame)'], monId: 'shi_try', jlpt: 'N4' },
    watashi:{ char: '私', meaning: 'Tôi / Riêng tư', on: ['シ (shi)'], kun: ['わたくし (watakushi)', 'わたし (watashi)'], monId: 'watashi', jlpt: 'N4' },
    ji_letter:{ char: '字', meaning: 'Chữ / Tự', on: ['ジ (ji)'], kun: ['あざ (aza)'], monId: 'ji_letter', jlpt: 'N4' },
    mizukara:{ char: '自', meaning: 'Tự mình', on: ['ジ (ji)', 'シ (shi)'], kun: ['みずか (mizuka)'], monId: 'mizukara', jlpt: 'N4' },
    koto:{ char: '事', meaning: 'Việc / Sự', on: ['ジ (ji)', 'ズ (zu)'], kun: ['こと (koto)'], monId: 'koto', jlpt: 'N4' },
    motsu:{ char: '持', meaning: 'Cầm / Giữ', on: ['ジ (ji)'], kun: ['も (mo)'], monId: 'motsu', jlpt: 'N4' },
    shitsu_room:{ char: '室', meaning: 'Phòng / Thất', on: ['シツ (shitsu)'], kun: ['むろ (muro)'], monId: 'shitsu_room', jlpt: 'N4' },
    shitsu_quality:{ char: '質', meaning: 'Chất / Chất lượng', on: ['シツ (shitsu)', 'シチ (shichi)', 'チ (chi)'], kun: ['たち (tachi)', 'ただ (tada)'], monId: 'shitsu_quality', jlpt: 'N4' },
    utsusu:{ char: '写', meaning: 'Chụp / Sao chép', on: ['シャ (sha)', 'ジャ (ja)'], kun: ['うつ (utsu)'], monId: 'utsusu', jlpt: 'N4' },
    mono_person:{ char: '者', meaning: 'Người / Giả', on: ['シャ (sha)'], kun: ['もの (mono)'], monId: 'mono_person', jlpt: 'N4' },
    kariru:{ char: '借', meaning: 'Mượn / Tá', on: ['シャク (shaku)'], kun: ['か (ka)'], monId: 'kariru', jlpt: 'N4' },
    yowai:{ char: '弱', meaning: 'Yếu / Nhược', on: ['ジャク (jaku)'], kun: ['よわ (yowa)'], monId: 'yowai', jlpt: 'N4' },
    kubi:{ char: '首', meaning: 'Cổ / Đầu / Thủ', on: ['シュ (shu)'], kun: ['くび (kubi)'], monId: 'kubi', jlpt: 'N4' },
    shu_main:{ char: '主', meaning: 'Chính / Chủ', on: ['シュ (shu)', 'ス (su)'], kun: ['ぬし (nushi)', 'おも (omo)'], monId: 'shu_main', jlpt: 'N4' },
    aki:{ char: '秋', meaning: 'Mùa thu', on: ['シュウ (shuu)'], kun: ['あき (aki)'], monId: 'aki', jlpt: 'N4' },
    atsumeru:{ char: '集', meaning: 'Tập hợp / Thu thập', on: ['シュウ (shuu)'], kun: ['あつ (atsu)'], monId: 'atsumeru', jlpt: 'N4' },
    narau:{ char: '習', meaning: 'Học / Luyện tập', on: ['シュウ (shuu)'], kun: ['なら (nara)'], monId: 'narau', jlpt: 'N4' },
    owaru:{ char: '終', meaning: 'Kết thúc', on: ['シュウ (shuu)'], kun: ['お (o)'], monId: 'owaru', jlpt: 'N4' },
    sumu:{ char: '住', meaning: 'Sống / Cư trú', on: ['ジュウ (juu)'], kun: ['す (su)'], monId: 'sumu', jlpt: 'N4' },
    omoi_heavy:{ char: '重', meaning: 'Nặng / Quan trọng', on: ['ジュウ (juu)', 'チョウ (chou)'], kun: ['おも (omo)', 'かさ (kasa)'], monId: 'omoi_heavy', jlpt: 'N4' },
    haru:{ char: '春', meaning: 'Mùa xuân', on: ['シュン (shun)'], kun: ['はる (haru)'], monId: 'haru', jlpt: 'N4' },
    tokoro:{ char: '所', meaning: 'Nơi / Chỗ', on: ['ショ (sho)'], kun: ['ところ (tokoro)'], monId: 'tokoro', jlpt: 'N4' },
    atsui:{ char: '暑', meaning: 'Nóng (thời tiết)', on: ['ショ (sho)'], kun: ['あつ (atsu)'], monId: 'atsui', jlpt: 'N4' },
    ba:{ char: '場', meaning: 'Nơi / Sân / Trường', on: ['ジョウ (jou)'], kun: ['ば (ba)'], monId: 'ba', jlpt: 'N4' },
    noru:{ char: '乗', meaning: 'Lên / Đi (phương tiện)', on: ['ジョウ (jou)'], kun: ['の (no)'], monId: 'noru', jlpt: 'N4' },
    iro:{ char: '色', meaning: 'Màu sắc', on: ['ショク (shoku)', 'シキ (shiki)'], kun: ['いろ (iro)'], monId: 'iro', jlpt: 'N4' },
    mori:{ char: '森', meaning: 'Rừng', on: ['シン (shin)'], kun: ['もり (mori)'], monId: 'mori', jlpt: 'N4' },
    kokoro:{ char: '心', meaning: 'Tim / Tâm trí', on: ['シン (shin)'], kun: ['こころ (kokoro)'], monId: 'kokoro', jlpt: 'N4' },
    oya:{ char: '親', meaning: 'Cha mẹ / Thân thiết', on: ['シン (shin)'], kun: ['おや (oya)', 'した (shita)'], monId: 'oya', jlpt: 'N4' },
    shin_truth:{ char: '真', meaning: 'Thật / Chân', on: ['シン (shin)'], kun: ['ま (ma)', 'まこと (makoto)'], monId: 'shin_truth', jlpt: 'N4' },
    susumu:{ char: '進', meaning: 'Tiến / Đi tới', on: ['シン (shin)'], kun: ['すす (susu)'], monId: 'susumu', jlpt: 'N4' },
    zu:{ char: '図', meaning: 'Sơ đồ / Bản đồ', on: ['ズ (zu)', 'ト (to)'], kun: ['はか (haka)'], monId: 'zu', jlpt: 'N4' },
    ao:{ char: '青', meaning: 'Xanh / Thanh', on: ['セイ (sei)', 'ショウ (shou)'], kun: ['あお (ao)'], monId: 'ao', jlpt: 'N4' },
    tadashii:{ char: '正', meaning: 'Đúng / Chính', on: ['セイ (sei)', 'ショウ (shou)'], kun: ['ただ (tada)', 'まさ (masa)'], monId: 'tadashii', jlpt: 'N4' },
    koe:{ char: '声', meaning: 'Giọng / Tiếng', on: ['セイ (sei)', 'ショウ (shou)'], kun: ['こえ (koe)'], monId: 'koe', jlpt: 'N4' },
    yo:{ char: '世', meaning: 'Thế giới / Đời', on: ['セイ (sei)', 'セ (se)'], kun: ['よ (yo)'], monId: 'yo', jlpt: 'N4' },
    aka:{ char: '赤', meaning: 'Đỏ / Xích', on: ['セキ (seki)', 'シャク (shaku)'], kun: ['あか (aka)'], monId: 'aka', jlpt: 'N4' },
    yuu:{ char: '夕', meaning: 'Buổi tối / Tịch', on: ['セキ (seki)'], kun: ['ゆう (yuu)'], monId: 'yuu', jlpt: 'N4' },
    kiru:{ char: '切', meaning: 'Cắt / Quan trọng', on: ['セツ (setsu)', 'サイ (sai)'], kun: ['き (ki)'], monId: 'kiru', jlpt: 'N4' },
    toku:{ char: '説', meaning: 'Giải thích / Thuyết', on: ['セツ (setsu)', 'ゼイ (zei)'], kun: ['と (to)'], monId: 'toku', jlpt: 'N4' },
    arau:{ char: '洗', meaning: 'Rửa / Tẩy', on: ['セン (sen)'], kun: ['あら (ara)'], monId: 'arau', jlpt: 'N4' },
    hayai:{ char: '早', meaning: 'Sớm / Nhanh', on: ['ソウ (sou)', 'サッ (sa)'], kun: ['はや (haya)'], monId: 'hayai', jlpt: 'N4' },
    hashiru:{ char: '走', meaning: 'Chạy / Tẩu', on: ['ソウ (sou)'], kun: ['はし (hashi)'], monId: 'hashiru', jlpt: 'N4' },
    okuru:{ char: '送', meaning: 'Gửi / Tiễn', on: ['ソウ (sou)'], kun: ['おく (oku)'], monId: 'okuru', jlpt: 'N4' },
    zoku:{ char: '族', meaning: 'Gia tộc / Nhóm', on: ['ゾク (zoku)'], kun: [], monId: 'zoku', jlpt: 'N4' },
    mura:{ char: '村', meaning: 'Làng / Thôn', on: ['ソン (son)'], kun: ['むら (mura)'], monId: 'mura', jlpt: 'N4' },
    karada:{ char: '体', meaning: 'Cơ thể / Thể', on: ['タイ (tai)', 'テイ (tei)'], kun: ['からだ (karada)'], monId: 'karada', jlpt: 'N4' },
    futoi:{ char: '太', meaning: 'To / Dày / Thái', on: ['タイ (tai)', 'タ (ta)'], kun: ['ふと (futo)'], monId: 'futoi', jlpt: 'N4' },
    matsu:{ char: '待', meaning: 'Chờ / Đợi', on: ['タイ (tai)'], kun: ['ま (ma)'], monId: 'matsu', jlpt: 'N4' },
    kasu:{ char: '貸', meaning: 'Cho mượn', on: ['タイ (tai)'], kun: ['か (ka)'], monId: 'kasu', jlpt: 'N4' },
    dai_platform:{ char: '台', meaning: 'Bệ / Đài', on: ['ダイ (dai)', 'タイ (tai)'], kun: [], monId: 'dai_platform', jlpt: 'N4' },
    dai_generation:{ char: '代', meaning: 'Thay thế / Đời', on: ['ダイ (dai)', 'タイ (tai)'], kun: ['か (ka)', 'よ (yo)'], monId: 'dai_generation', jlpt: 'N4' },
    dai_topic:{ char: '題', meaning: 'Đề tài / Câu hỏi', on: ['ダイ (dai)'], kun: [], monId: 'dai_topic', jlpt: 'N4' },
    mijikai:{ char: '短', meaning: 'Ngắn / Đoản', on: ['タン (tan)'], kun: ['みじか (mijika)'], monId: 'mijikai', jlpt: 'N4' },
    shiru:{ char: '知', meaning: 'Biết / Tri', on: ['チ (chi)'], kun: ['し (shi)'], monId: 'shiru', jlpt: 'N4' },
    chi_ground:{ char: '地', meaning: 'Đất / Địa', on: ['チ (chi)', 'ジ (ji)'], kun: [], monId: 'chi_ground', jlpt: 'N4' },
    ike:{ char: '池', meaning: 'Ao / Hồ', on: ['チ (chi)'], kun: ['いけ (ike)'], monId: 'ike', jlpt: 'N4' },
    cha:{ char: '茶', meaning: 'Trà', on: ['チャ (cha)', 'サ (sa)'], kun: [], monId: 'cha', jlpt: 'N4' },
    kiru_wear:{ char: '着', meaning: 'Mặc / Đến nơi', on: ['チャク (chaku)', 'ジャク (jaku)'], kun: ['き (ki)', 'つ (tsu)'], monId: 'kiru_wear', jlpt: 'N4' },
    hiru:{ char: '昼', meaning: 'Ban trưa', on: ['チュウ (chuu)'], kun: ['ひる (hiru)'], monId: 'hiru', jlpt: 'N4' },
    sosogu:{ char: '注', meaning: 'Chú ý / Rót', on: ['チュウ (chuu)'], kun: ['そそ (soso)'], monId: 'sosogu', jlpt: 'N4' },
    machi:{ char: '町', meaning: 'Phố / Thị trấn', on: ['チョウ (chou)'], kun: ['まち (machi)'], monId: 'machi', jlpt: 'N4' },
    tori:{ char: '鳥', meaning: 'Chim / Điểu', on: ['チョウ (chou)'], kun: ['とり (tori)'], monId: 'tori', jlpt: 'N4' },
    asa:{ char: '朝', meaning: 'Buổi sáng / Triều', on: ['チョウ (chou)'], kun: ['あさ (asa)'], monId: 'asa', jlpt: 'N4' },
    tooru:{ char: '通', meaning: 'Đi qua / Thông', on: ['ツウ (tsuu)', 'ツ (tsu)'], kun: ['とお (too)', 'かよ (kayo)'], monId: 'tooru', jlpt: 'N4' },
    otouto:{ char: '弟', meaning: 'Em trai / Đệ', on: ['テイ (tei)', 'ダイ (dai)', 'デ (de)'], kun: ['おとうと (otouto)'], monId: 'otouto', jlpt: 'N4' },
    hikui:{ char: '低', meaning: 'Thấp', on: ['テイ (tei)'], kun: ['ひく (hiku)'], monId: 'hikui', jlpt: 'N4' },
    korobu:{ char: '転', meaning: 'Chuyển / Ngã', on: ['テン (ten)'], kun: ['ころ (koro)'], monId: 'korobu', jlpt: 'N4' },
    ta_ricefield:{ char: '田', meaning: 'Ruộng / Điền', on: ['デン (den)'], kun: ['た (ta)'], monId: 'ta_ricefield', jlpt: 'N4' },
    miyako:{ char: '都', meaning: 'Thủ đô / Đô thị', on: ['ト (to)', 'ツ (tsu)'], kun: ['みやこ (miyako)'], monId: 'miyako', jlpt: 'N4' },
    do_degree:{ char: '度', meaning: 'Mức độ / Lần', on: ['ド (do)', 'ト (to)', 'タク (taku)'], kun: ['たび (tabi)'], monId: 'do_degree', jlpt: 'N4' },
    kotaeru:{ char: '答', meaning: 'Trả lời / Đáp', on: ['トウ (tou)'], kun: ['こた (kota)'], monId: 'kotaeru', jlpt: 'N4' },
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
    { word: '水', mean: 'nước', target: '水', answer: 'みず', romaji: 'mizu', type: 'kun', wordReading: 'みず', wordRomaji: 'mizu',
      sentence: 'まいにち 水を のみます。', sentenceReading: 'まいにち みずを のみます。', sentenceMeaning: 'Hằng ngày tôi uống nước.', parts: [
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
    // 以
    { word: '以上', mean: 'trở lên / hơn nữa', target: '以', answer: 'い', romaji: 'i', type: 'on', wordReading: 'いじょう', wordRomaji: 'ijou', parts: [
      { text: '以', reading: 'い', romaji: 'i', meaning: 'từ / trở lên', role: 'target' }, { text: '上', reading: 'じょう', romaji: 'jou', meaning: 'trên', role: 'support' }] },
    { word: '以前', mean: 'trước đây / trước khi', target: '以', answer: 'い', romaji: 'i', type: 'on', wordReading: 'いぜん', wordRomaji: 'izen', parts: [
      { text: '以', reading: 'い', romaji: 'i', meaning: 'từ / mốc', role: 'target' }, { text: '前', reading: 'ぜん', romaji: 'zen', meaning: 'trước', role: 'support' }] },
    // 引
    { word: '引用', mean: 'trích dẫn', target: '引', answer: 'いん', romaji: 'in', type: 'on', wordReading: 'いんよう', wordRomaji: 'inyou', parts: [
      { text: '引', reading: 'いん', romaji: 'in', meaning: 'dẫn', role: 'target' }, { text: '用', reading: 'よう', romaji: 'you', meaning: 'dùng', role: 'support' }] },
    { word: '引く', mean: 'kéo / rút', target: '引', answer: 'ひ', romaji: 'hi', type: 'kun', wordReading: 'ひく', wordRomaji: 'hiku', parts: [
      { text: '引', reading: 'ひ', romaji: 'hi', meaning: 'kéo', role: 'target' }, { text: 'く', reading: 'く', romaji: 'ku', meaning: '', role: 'kana' }] },
    // 院
    { word: '病院', mean: 'bệnh viện', target: '院', answer: 'いん', romaji: 'in', type: 'on', wordReading: 'びょういん', wordRomaji: 'byouin', parts: [
      { text: '病', reading: 'びょう', romaji: 'byou', meaning: 'bệnh', role: 'support' }, { text: '院', reading: 'いん', romaji: 'in', meaning: 'viện', role: 'target' }] },
    { word: '入院', mean: 'nhập viện', target: '院', answer: 'いん', romaji: 'in', type: 'on', wordReading: 'にゅういん', wordRomaji: 'nyuuin', parts: [
      { text: '入', reading: 'にゅう', romaji: 'nyuu', meaning: 'vào', role: 'support' }, { text: '院', reading: 'いん', romaji: 'in', meaning: 'viện', role: 'target' }] },
    // 員
    { word: '店員', mean: 'nhân viên cửa hàng', target: '員', answer: 'いん', romaji: 'in', type: 'on', wordReading: 'てんいん', wordRomaji: 'tenin', parts: [
      { text: '店', reading: 'てん', romaji: 'ten', meaning: 'cửa hàng', role: 'support' }, { text: '員', reading: 'いん', romaji: 'in', meaning: 'nhân viên', role: 'target' }] },
    { word: '会社員', mean: 'nhân viên công ty', target: '員', answer: 'いん', romaji: 'in', type: 'on', wordReading: 'かいしゃいん', wordRomaji: 'kaishain', parts: [
      { text: '会社', reading: 'かいしゃ', romaji: 'kaisha', meaning: 'công ty', role: 'support' }, { text: '員', reading: 'いん', romaji: 'in', meaning: 'nhân viên', role: 'target' }] },
    // 運
    { word: '運動', mean: 'vận động / tập thể dục', target: '運', answer: 'うん', romaji: 'un', type: 'on', wordReading: 'うんどう', wordRomaji: 'undou', parts: [
      { text: '運', reading: 'うん', romaji: 'un', meaning: 'vận động', role: 'target' }, { text: '動', reading: 'どう', romaji: 'dou', meaning: 'chuyển động', role: 'support' }] },
    { word: '運ぶ', mean: 'vận chuyển / mang', target: '運', answer: 'はこ', romaji: 'hako', type: 'kun', wordReading: 'はこぶ', wordRomaji: 'hakobu', parts: [
      { text: '運', reading: 'はこ', romaji: 'hako', meaning: 'vận chuyển', role: 'target' }, { text: 'ぶ', reading: 'ぶ', romaji: 'bu', meaning: '', role: 'kana' }] },
    // 英
    { word: '英語', mean: 'tiếng Anh', target: '英', answer: 'えい', romaji: 'ei', type: 'on', wordReading: 'えいご', wordRomaji: 'eigo', parts: [
      { text: '英', reading: 'えい', romaji: 'ei', meaning: 'Anh', role: 'target' }, { text: '語', reading: 'ご', romaji: 'go', meaning: 'ngôn ngữ', role: 'support' }] },
    { word: '英国', mean: 'nước Anh', target: '英', answer: 'えい', romaji: 'ei', type: 'on', wordReading: 'えいこく', wordRomaji: 'eikoku', parts: [
      { text: '英', reading: 'えい', romaji: 'ei', meaning: 'Anh', role: 'target' }, { text: '国', reading: 'こく', romaji: 'koku', meaning: 'quốc gia', role: 'support' }] },
    // 映
    { word: '映画', mean: 'phim điện ảnh', target: '映', answer: 'えい', romaji: 'ei', type: 'on', wordReading: 'えいが', wordRomaji: 'eiga', parts: [
      { text: '映', reading: 'えい', romaji: 'ei', meaning: 'chiếu', role: 'target' }, { text: '画', reading: 'が', romaji: 'ga', meaning: 'hình ảnh', role: 'support' }] },
    { word: '映る', mean: 'được chiếu / phản chiếu', target: '映', answer: 'うつ', romaji: 'utsu', type: 'kun', wordReading: 'うつる', wordRomaji: 'utsuru', parts: [
      { text: '映', reading: 'うつ', romaji: 'utsu', meaning: 'phản chiếu', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 遠
    { word: '遠足', mean: 'chuyến dã ngoại', target: '遠', answer: 'えん', romaji: 'en', type: 'on', wordReading: 'えんそく', wordRomaji: 'ensoku', parts: [
      { text: '遠', reading: 'えん', romaji: 'en', meaning: 'xa', role: 'target' }, { text: '足', reading: 'そく', romaji: 'soku', meaning: 'chân / chuyến đi', role: 'support' }] },
    { word: '遠い', mean: 'xa', target: '遠', answer: 'とお', romaji: 'too', type: 'kun', wordReading: 'とおい', wordRomaji: 'tooi', parts: [
      { text: '遠', reading: 'とお', romaji: 'too', meaning: 'xa', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 屋
    { word: '屋上', mean: 'sân thượng / mái nhà', target: '屋', answer: 'おく', romaji: 'oku', type: 'on', wordReading: 'おくじょう', wordRomaji: 'okujou', parts: [
      { text: '屋', reading: 'おく', romaji: 'oku', meaning: 'mái / nhà', role: 'target' }, { text: '上', reading: 'じょう', romaji: 'jou', meaning: 'trên', role: 'support' }] },
    { word: '本屋', mean: 'hiệu sách', target: '屋', answer: 'や', romaji: 'ya', type: 'kun', wordReading: 'ほんや', wordRomaji: 'honya', parts: [
      { text: '本', reading: 'ほん', romaji: 'hon', meaning: 'sách', role: 'support' }, { text: '屋', reading: 'や', romaji: 'ya', meaning: 'cửa hàng', role: 'target' }] },
    // 歌
    { word: '歌手', mean: 'ca sĩ', target: '歌', answer: 'か', romaji: 'ka', type: 'on', wordReading: 'かしゅ', wordRomaji: 'kashu', parts: [
      { text: '歌', reading: 'か', romaji: 'ka', meaning: 'bài hát', role: 'target' }, { text: '手', reading: 'しゅ', romaji: 'shu', meaning: 'người làm', role: 'support' }] },
    { word: '歌う', mean: 'hát', target: '歌', answer: 'うた', romaji: 'uta', type: 'kun', wordReading: 'うたう', wordRomaji: 'utau', parts: [
      { text: '歌', reading: 'うた', romaji: 'uta', meaning: 'hát', role: 'target' }, { text: 'う', reading: 'う', romaji: 'u', meaning: '', role: 'kana' }] },
    // 夏
    { word: '夏季', mean: 'mùa hè / mùa hạ', target: '夏', answer: 'か', romaji: 'ka', type: 'on', wordReading: 'かき', wordRomaji: 'kaki', parts: [
      { text: '夏', reading: 'か', romaji: 'ka', meaning: 'mùa hè', role: 'target' }, { text: '季', reading: 'き', romaji: 'ki', meaning: 'mùa', role: 'support' }] },
    { word: '夏休み', mean: 'kỳ nghỉ hè', target: '夏', answer: 'なつ', romaji: 'natsu', type: 'kun', wordReading: 'なつやすみ', wordRomaji: 'natsuyasumi', parts: [
      { text: '夏', reading: 'なつ', romaji: 'natsu', meaning: 'mùa hè', role: 'target' }, { text: '休', reading: 'やす', romaji: 'yasu', meaning: 'nghỉ', role: 'support' }, { text: 'み', reading: 'み', romaji: 'mi', meaning: '', role: 'kana' }] },
    // 家
    { word: '家族', mean: 'gia đình', target: '家', answer: 'か', romaji: 'ka', type: 'on', wordReading: 'かぞく', wordRomaji: 'kazoku', parts: [
      { text: '家', reading: 'か', romaji: 'ka', meaning: 'gia đình', role: 'target' }, { text: '族', reading: 'ぞく', romaji: 'zoku', meaning: 'nhóm / tộc', role: 'support' }] },
    { word: '家', mean: 'ngôi nhà', target: '家', answer: 'いえ', romaji: 'ie', type: 'kun', wordReading: 'いえ', wordRomaji: 'ie', parts: [
      { text: '家', reading: 'いえ', romaji: 'ie', meaning: 'nhà', role: 'target' }] },
    // 画
    { word: '映画', mean: 'phim điện ảnh', target: '画', answer: 'が', romaji: 'ga', type: 'on', wordReading: 'えいが', wordRomaji: 'eiga', parts: [
      { text: '映', reading: 'えい', romaji: 'ei', meaning: 'chiếu', role: 'support' }, { text: '画', reading: 'が', romaji: 'ga', meaning: 'hình ảnh', role: 'target' }] },
    { word: '計画', mean: 'kế hoạch', target: '画', answer: 'かく', romaji: 'kaku', type: 'on', wordReading: 'けいかく', wordRomaji: 'keikaku', parts: [
      { text: '計', reading: 'けい', romaji: 'kei', meaning: 'tính toán', role: 'support' }, { text: '画', reading: 'かく', romaji: 'kaku', meaning: 'kế hoạch / nét', role: 'target' }] },
    // 海
    { word: '海外', mean: 'hải ngoại / nước ngoài', target: '海', answer: 'かい', romaji: 'kai', type: 'on', wordReading: 'かいがい', wordRomaji: 'kaigai', parts: [
      { text: '海', reading: 'かい', romaji: 'kai', meaning: 'biển', role: 'target' }, { text: '外', reading: 'がい', romaji: 'gai', meaning: 'ngoài', role: 'support' }] },
    { word: '海', mean: 'biển', target: '海', answer: 'うみ', romaji: 'umi', type: 'kun', wordReading: 'うみ', wordRomaji: 'umi', parts: [
      { text: '海', reading: 'うみ', romaji: 'umi', meaning: 'biển', role: 'target' }] },
    // 回
    { word: '今回', mean: 'lần này', target: '回', answer: 'かい', romaji: 'kai', type: 'on', wordReading: 'こんかい', wordRomaji: 'konkai', parts: [
      { text: '今', reading: 'こん', romaji: 'kon', meaning: 'lần này / hiện tại', role: 'support' }, { text: '回', reading: 'かい', romaji: 'kai', meaning: 'lần', role: 'target' }] },
    { word: '回る', mean: 'xoay / đi vòng', target: '回', answer: 'まわ', romaji: 'mawa', type: 'kun', wordReading: 'まわる', wordRomaji: 'mawaru', parts: [
      { text: '回', reading: 'まわ', romaji: 'mawa', meaning: 'xoay vòng', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 開
    { word: '開会', mean: 'khai mạc / mở cuộc họp', target: '開', answer: 'かい', romaji: 'kai', type: 'on', wordReading: 'かいかい', wordRomaji: 'kaikai', parts: [
      { text: '開', reading: 'かい', romaji: 'kai', meaning: 'mở', role: 'target' }, { text: '会', reading: 'かい', romaji: 'kai', meaning: 'cuộc họp', role: 'support' }] },
    { word: '開く', mean: 'mở ra', target: '開', answer: 'ひら', romaji: 'hira', type: 'kun', wordReading: 'ひらく', wordRomaji: 'hiraku', parts: [
      { text: '開', reading: 'ひら', romaji: 'hira', meaning: 'mở', role: 'target' }, { text: 'く', reading: 'く', romaji: 'ku', meaning: '', role: 'kana' }] },
    // 界
    { word: '世界', mean: 'thế giới', target: '界', answer: 'かい', romaji: 'kai', type: 'on', wordReading: 'せかい', wordRomaji: 'sekai', parts: [
      { text: '世', reading: 'せ', romaji: 'se', meaning: 'đời / thế', role: 'support' }, { text: '界', reading: 'かい', romaji: 'kai', meaning: 'thế giới', role: 'target' }] },
    { word: '業界', mean: 'ngành nghề / giới kinh doanh', target: '界', answer: 'かい', romaji: 'kai', type: 'on', wordReading: 'ぎょうかい', wordRomaji: 'gyoukai', parts: [
      { text: '業', reading: 'ぎょう', romaji: 'gyou', meaning: 'ngành nghề', role: 'support' }, { text: '界', reading: 'かい', romaji: 'kai', meaning: 'giới', role: 'target' }] },
    // 楽
    { word: '音楽', mean: 'âm nhạc', target: '楽', answer: 'がく', romaji: 'gaku', type: 'on', wordReading: 'おんがく', wordRomaji: 'ongaku', parts: [
      { text: '音', reading: 'おん', romaji: 'on', meaning: 'âm thanh', role: 'support' }, { text: '楽', reading: 'がく', romaji: 'gaku', meaning: 'nhạc', role: 'target' }] },
    { word: '楽しい', mean: 'vui vẻ', target: '楽', answer: 'たの', romaji: 'tano', type: 'kun', wordReading: 'たのしい', wordRomaji: 'tanoshii', parts: [
      { text: '楽', reading: 'たの', romaji: 'tano', meaning: 'vui', role: 'target' }, { text: 'しい', reading: 'しい', romaji: 'shii', meaning: '', role: 'kana' }] },
    // 館
    { word: '図書館', mean: 'thư viện', target: '館', answer: 'かん', romaji: 'kan', type: 'on', wordReading: 'としょかん', wordRomaji: 'toshokan', parts: [
      { text: '図書', reading: 'としょ', romaji: 'tosho', meaning: 'sách', role: 'support' }, { text: '館', reading: 'かん', romaji: 'kan', meaning: 'tòa nhà', role: 'target' }] },
    { word: '映画館', mean: 'rạp chiếu phim', target: '館', answer: 'かん', romaji: 'kan', type: 'on', wordReading: 'えいがかん', wordRomaji: 'eigakan', parts: [
      { text: '映画', reading: 'えいが', romaji: 'eiga', meaning: 'phim', role: 'support' }, { text: '館', reading: 'かん', romaji: 'kan', meaning: 'tòa nhà / rạp', role: 'target' }] },
    // 漢
    { word: '漢字', mean: 'chữ Kanji / Hán tự', target: '漢', answer: 'かん', romaji: 'kan', type: 'on', wordReading: 'かんじ', wordRomaji: 'kanji', parts: [
      { text: '漢', reading: 'かん', romaji: 'kan', meaning: 'Hán', role: 'target' }, { text: '字', reading: 'じ', romaji: 'ji', meaning: 'chữ', role: 'support' }] },
    { word: '漢語', mean: 'từ Hán Nhật', target: '漢', answer: 'かん', romaji: 'kan', type: 'on', wordReading: 'かんご', wordRomaji: 'kango', parts: [
      { text: '漢', reading: 'かん', romaji: 'kan', meaning: 'Hán', role: 'target' }, { text: '語', reading: 'ご', romaji: 'go', meaning: 'từ ngữ', role: 'support' }] },
    // 寒
    { word: '寒気', mean: 'khí lạnh / cảm giác ớn lạnh', target: '寒', answer: 'かん', romaji: 'kan', type: 'on', wordReading: 'かんき', wordRomaji: 'kanki', parts: [
      { text: '寒', reading: 'かん', romaji: 'kan', meaning: 'lạnh', role: 'target' }, { text: '気', reading: 'き', romaji: 'ki', meaning: 'khí', role: 'support' }] },
    { word: '寒い', mean: 'lạnh', target: '寒', answer: 'さむ', romaji: 'samu', type: 'kun', wordReading: 'さむい', wordRomaji: 'samui', parts: [
      { text: '寒', reading: 'さむ', romaji: 'samu', meaning: 'lạnh', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 顔
    { word: '顔面', mean: 'khuôn mặt / vùng mặt', target: '顔', answer: 'がん', romaji: 'gan', type: 'on', wordReading: 'がんめん', wordRomaji: 'ganmen', parts: [
      { text: '顔', reading: 'がん', romaji: 'gan', meaning: 'mặt', role: 'target' }, { text: '面', reading: 'めん', romaji: 'men', meaning: 'bề mặt', role: 'support' }] },
    { word: '顔', mean: 'khuôn mặt', target: '顔', answer: 'かお', romaji: 'kao', type: 'kun', wordReading: 'かお', wordRomaji: 'kao', parts: [
      { text: '顔', reading: 'かお', romaji: 'kao', meaning: 'khuôn mặt', role: 'target' }] },
    // 帰
    { word: '帰国', mean: 'về nước', target: '帰', answer: 'き', romaji: 'ki', type: 'on', wordReading: 'きこく', wordRomaji: 'kikoku', parts: [
      { text: '帰', reading: 'き', romaji: 'ki', meaning: 'trở về', role: 'target' }, { text: '国', reading: 'こく', romaji: 'koku', meaning: 'đất nước', role: 'support' }] },
    { word: '帰る', mean: 'trở về', target: '帰', answer: 'かえ', romaji: 'kae', type: 'kun', wordReading: 'かえる', wordRomaji: 'kaeru', parts: [
      { text: '帰', reading: 'かえ', romaji: 'kae', meaning: 'trở về', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 起
    { word: '起立', mean: 'đứng dậy', target: '起', answer: 'き', romaji: 'ki', type: 'on', wordReading: 'きりつ', wordRomaji: 'kiritsu', parts: [
      { text: '起', reading: 'き', romaji: 'ki', meaning: 'đứng lên', role: 'target' }, { text: '立', reading: 'りつ', romaji: 'ritsu', meaning: 'đứng', role: 'support' }] },
    { word: '起きる', mean: 'thức dậy', target: '起', answer: 'お', romaji: 'o', type: 'kun', wordReading: 'おきる', wordRomaji: 'okiru', parts: [
      { text: '起', reading: 'お', romaji: 'o', meaning: 'dậy', role: 'target' }, { text: 'きる', reading: 'きる', romaji: 'kiru', meaning: '', role: 'kana' }] },
    // 究
    { word: '研究', mean: 'nghiên cứu', target: '究', answer: 'きゅう', romaji: 'kyuu', type: 'on', wordReading: 'けんきゅう', wordRomaji: 'kenkyuu', parts: [
      { text: '研', reading: 'けん', romaji: 'ken', meaning: 'mài giũa / nghiên cứu', role: 'support' }, { text: '究', reading: 'きゅう', romaji: 'kyuu', meaning: 'nghiên cứu đến cùng', role: 'target' }] },
    { word: '究明', mean: 'điều tra làm rõ', target: '究', answer: 'きゅう', romaji: 'kyuu', type: 'on', wordReading: 'きゅうめい', wordRomaji: 'kyuumei', parts: [
      { text: '究', reading: 'きゅう', romaji: 'kyuu', meaning: 'truy cứu', role: 'target' }, { text: '明', reading: 'めい', romaji: 'mei', meaning: 'làm rõ', role: 'support' }] },
    // 急
    { word: '急行', mean: 'tàu tốc hành', target: '急', answer: 'きゅう', romaji: 'kyuu', type: 'on', wordReading: 'きゅうこう', wordRomaji: 'kyuukou', parts: [
      { text: '急', reading: 'きゅう', romaji: 'kyuu', meaning: 'nhanh / gấp', role: 'target' }, { text: '行', reading: 'こう', romaji: 'kou', meaning: 'chạy / đi', role: 'support' }] },
    { word: '急ぐ', mean: 'vội / nhanh lên', target: '急', answer: 'いそ', romaji: 'iso', type: 'kun', wordReading: 'いそぐ', wordRomaji: 'isogu', parts: [
      { text: '急', reading: 'いそ', romaji: 'iso', meaning: 'vội', role: 'target' }, { text: 'ぐ', reading: 'ぐ', romaji: 'gu', meaning: '', role: 'kana' }] },
    // 牛
    { word: '牛肉', mean: 'thịt bò', target: '牛', answer: 'ぎゅう', romaji: 'gyuu', type: 'on', wordReading: 'ぎゅうにく', wordRomaji: 'gyuuniku', parts: [
      { text: '牛', reading: 'ぎゅう', romaji: 'gyuu', meaning: 'bò', role: 'target' }, { text: '肉', reading: 'にく', romaji: 'niku', meaning: 'thịt', role: 'support' }] },
    { word: '牛', mean: 'con bò', target: '牛', answer: 'うし', romaji: 'ushi', type: 'kun', wordReading: 'うし', wordRomaji: 'ushi', parts: [
      { text: '牛', reading: 'うし', romaji: 'ushi', meaning: 'bò', role: 'target' }] },
    // 去
    { word: '去年', mean: 'năm ngoái', target: '去', answer: 'きょ', romaji: 'kyo', type: 'on', wordReading: 'きょねん', wordRomaji: 'kyonen', parts: [
      { text: '去', reading: 'きょ', romaji: 'kyo', meaning: 'đã qua', role: 'target' }, { text: '年', reading: 'ねん', romaji: 'nen', meaning: 'năm', role: 'support' }] },
    { word: '去る', mean: 'rời đi', target: '去', answer: 'さ', romaji: 'sa', type: 'kun', wordReading: 'さる', wordRomaji: 'saru', parts: [
      { text: '去', reading: 'さ', romaji: 'sa', meaning: 'rời đi', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 強
    { word: '強力', mean: 'mạnh mẽ / cường lực', target: '強', answer: 'きょう', romaji: 'kyou', type: 'on', wordReading: 'きょうりょく', wordRomaji: 'kyouryoku', parts: [
      { text: '強', reading: 'きょう', romaji: 'kyou', meaning: 'mạnh', role: 'target' }, { text: '力', reading: 'りょく', romaji: 'ryoku', meaning: 'sức lực', role: 'support' }] },
    { word: '強い', mean: 'mạnh', target: '強', answer: 'つよ', romaji: 'tsuyo', type: 'kun', wordReading: 'つよい', wordRomaji: 'tsuyoi', parts: [
      { text: '強', reading: 'つよ', romaji: 'tsuyo', meaning: 'mạnh', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 教
    { word: '教室', mean: 'lớp học', target: '教', answer: 'きょう', romaji: 'kyou', type: 'on', wordReading: 'きょうしつ', wordRomaji: 'kyoushitsu', parts: [
      { text: '教', reading: 'きょう', romaji: 'kyou', meaning: 'dạy / giáo', role: 'target' }, { text: '室', reading: 'しつ', romaji: 'shitsu', meaning: 'phòng', role: 'support' }] },
    { word: '教える', mean: 'dạy / chỉ bảo', target: '教', answer: 'おし', romaji: 'oshi', type: 'kun', wordReading: 'おしえる', wordRomaji: 'oshieru', parts: [
      { text: '教', reading: 'おし', romaji: 'oshi', meaning: 'dạy', role: 'target' }, { text: 'える', reading: 'える', romaji: 'eru', meaning: '', role: 'kana' }] },
    // 京
    { word: '東京', mean: 'Tokyo / Đông Kinh', target: '京', answer: 'きょう', romaji: 'kyou', type: 'on', wordReading: 'とうきょう', wordRomaji: 'toukyou', parts: [
      { text: '東', reading: 'とう', romaji: 'tou', meaning: 'phía đông', role: 'support' }, { text: '京', reading: 'きょう', romaji: 'kyou', meaning: 'kinh đô', role: 'target' }] },
    { word: '京都', mean: 'Kyoto / kinh đô Kyoto', target: '京', answer: 'きょう', romaji: 'kyou', type: 'on', wordReading: 'きょうと', wordRomaji: 'kyouto', parts: [
      { text: '京', reading: 'きょう', romaji: 'kyou', meaning: 'kinh đô', role: 'target' }, { text: '都', reading: 'と', romaji: 'to', meaning: 'đô thị', role: 'support' }] },
    // 業
    { word: '授業', mean: 'buổi học / tiết học', target: '業', answer: 'ぎょう', romaji: 'gyou', type: 'on', wordReading: 'じゅぎょう', wordRomaji: 'jugyou', parts: [
      { text: '授', reading: 'じゅ', romaji: 'ju', meaning: 'truyền dạy', role: 'support' }, { text: '業', reading: 'ぎょう', romaji: 'gyou', meaning: 'việc học', role: 'target' }] },
    { word: '産業', mean: 'công nghiệp', target: '業', answer: 'ぎょう', romaji: 'gyou', type: 'on', wordReading: 'さんぎょう', wordRomaji: 'sangyou', parts: [
      { text: '産', reading: 'さん', romaji: 'san', meaning: 'sản xuất', role: 'support' }, { text: '業', reading: 'ぎょう', romaji: 'gyou', meaning: 'ngành nghề', role: 'target' }] },
    // 近
    { word: '近所', mean: 'hàng xóm / khu vực gần nhà', target: '近', answer: 'きん', romaji: 'kin', type: 'on', wordReading: 'きんじょ', wordRomaji: 'kinjo', parts: [
      { text: '近', reading: 'きん', romaji: 'kin', meaning: 'gần', role: 'target' }, { text: '所', reading: 'じょ', romaji: 'jo', meaning: 'nơi', role: 'support' }] },
    { word: '近い', mean: 'gần', target: '近', answer: 'ちか', romaji: 'chika', type: 'kun', wordReading: 'ちかい', wordRomaji: 'chikai', parts: [
      { text: '近', reading: 'ちか', romaji: 'chika', meaning: 'gần', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 銀
    { word: '銀行', mean: 'ngân hàng', target: '銀', answer: 'ぎん', romaji: 'gin', type: 'on', wordReading: 'ぎんこう', wordRomaji: 'ginkou', parts: [
      { text: '銀', reading: 'ぎん', romaji: 'gin', meaning: 'bạc / ngân', role: 'target' }, { text: '行', reading: 'こう', romaji: 'kou', meaning: 'cơ sở', role: 'support' }] },
    { word: '銀色', mean: 'màu bạc', target: '銀', answer: 'ぎん', romaji: 'gin', type: 'on', wordReading: 'ぎんいろ', wordRomaji: 'giniro', parts: [
      { text: '銀', reading: 'ぎん', romaji: 'gin', meaning: 'bạc', role: 'target' }, { text: '色', reading: 'いろ', romaji: 'iro', meaning: 'màu sắc', role: 'support' }] },
    // 区
    { word: '区役所', mean: 'văn phòng hành chính quận', target: '区', answer: 'く', romaji: 'ku', type: 'on', wordReading: 'くやくしょ', wordRomaji: 'kuyakusho', parts: [
      { text: '区', reading: 'く', romaji: 'ku', meaning: 'quận / khu', role: 'target' }, { text: '役所', reading: 'やくしょ', romaji: 'yakusho', meaning: 'cơ quan hành chính', role: 'support' }] },
    { word: '地区', mean: 'khu vực', target: '区', answer: 'く', romaji: 'ku', type: 'on', wordReading: 'ちく', wordRomaji: 'chiku', parts: [
      { text: '地', reading: 'ち', romaji: 'chi', meaning: 'đất / vùng', role: 'support' }, { text: '区', reading: 'く', romaji: 'ku', meaning: 'khu vực', role: 'target' }] },
    // 計
    { word: '計画', mean: 'kế hoạch', target: '計', answer: 'けい', romaji: 'kei', type: 'on', wordReading: 'けいかく', wordRomaji: 'keikaku', parts: [
      { text: '計', reading: 'けい', romaji: 'kei', meaning: 'tính toán', role: 'target' }, { text: '画', reading: 'かく', romaji: 'kaku', meaning: 'kế hoạch', role: 'support' }] },
    { word: '計る', mean: 'đo / tính', target: '計', answer: 'はか', romaji: 'haka', type: 'kun', wordReading: 'はかる', wordRomaji: 'hakaru', parts: [
      { text: '計', reading: 'はか', romaji: 'haka', meaning: 'đo', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 兄
    { word: '兄弟', mean: 'anh em', target: '兄', answer: 'きょう', romaji: 'kyou', type: 'on', wordReading: 'きょうだい', wordRomaji: 'kyoudai', parts: [
      { text: '兄', reading: 'きょう', romaji: 'kyou', meaning: 'anh trai', role: 'target' }, { text: '弟', reading: 'だい', romaji: 'dai', meaning: 'em trai', role: 'support' }] },
    { word: '兄', mean: 'anh trai', target: '兄', answer: 'あに', romaji: 'ani', type: 'kun', wordReading: 'あに', wordRomaji: 'ani', parts: [
      { text: '兄', reading: 'あに', romaji: 'ani', meaning: 'anh trai', role: 'target' }] },
    // 軽
    { word: '軽食', mean: 'bữa ăn nhẹ', target: '軽', answer: 'けい', romaji: 'kei', type: 'on', wordReading: 'けいしょく', wordRomaji: 'keishoku', parts: [
      { text: '軽', reading: 'けい', romaji: 'kei', meaning: 'nhẹ', role: 'target' }, { text: '食', reading: 'しょく', romaji: 'shoku', meaning: 'thức ăn', role: 'support' }] },
    { word: '軽い', mean: 'nhẹ', target: '軽', answer: 'かる', romaji: 'karu', type: 'kun', wordReading: 'かるい', wordRomaji: 'karui', parts: [
      { text: '軽', reading: 'かる', romaji: 'karu', meaning: 'nhẹ', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 犬
    { word: '番犬', mean: 'chó canh', target: '犬', answer: 'けん', romaji: 'ken', type: 'on', wordReading: 'ばんけん', wordRomaji: 'banken', parts: [
      { text: '番', reading: 'ばん', romaji: 'ban', meaning: 'canh gác', role: 'support' }, { text: '犬', reading: 'けん', romaji: 'ken', meaning: 'chó', role: 'target' }] },
    { word: '犬', mean: 'con chó', target: '犬', answer: 'いぬ', romaji: 'inu', type: 'kun', wordReading: 'いぬ', wordRomaji: 'inu', parts: [
      { text: '犬', reading: 'いぬ', romaji: 'inu', meaning: 'chó', role: 'target' }] },
    // 研
    { word: '研究', mean: 'nghiên cứu', target: '研', answer: 'けん', romaji: 'ken', type: 'on', wordReading: 'けんきゅう', wordRomaji: 'kenkyuu', parts: [
      { text: '研', reading: 'けん', romaji: 'ken', meaning: 'nghiên cứu', role: 'target' }, { text: '究', reading: 'きゅう', romaji: 'kyuu', meaning: 'đến cùng', role: 'support' }] },
    { word: '研ぐ', mean: 'mài / đánh bóng', target: '研', answer: 'と', romaji: 'to', type: 'kun', wordReading: 'とぐ', wordRomaji: 'togu', parts: [
      { text: '研', reading: 'と', romaji: 'to', meaning: 'mài', role: 'target' }, { text: 'ぐ', reading: 'ぐ', romaji: 'gu', meaning: '', role: 'kana' }] },
    // 県
    { word: '県立', mean: 'do tỉnh quản lý', target: '県', answer: 'けん', romaji: 'ken', type: 'on', wordReading: 'けんりつ', wordRomaji: 'kenritsu', parts: [
      { text: '県', reading: 'けん', romaji: 'ken', meaning: 'tỉnh', role: 'target' }, { text: '立', reading: 'りつ', romaji: 'ritsu', meaning: 'lập', role: 'support' }] },
    { word: '県庁', mean: 'trụ sở hành chính tỉnh', target: '県', answer: 'けん', romaji: 'ken', type: 'on', wordReading: 'けんちょう', wordRomaji: 'kenchou', parts: [
      { text: '県', reading: 'けん', romaji: 'ken', meaning: 'tỉnh', role: 'target' }, { text: '庁', reading: 'ちょう', romaji: 'chou', meaning: 'cơ quan', role: 'support' }] },
    // 建
    { word: '建設', mean: 'xây dựng', target: '建', answer: 'けん', romaji: 'ken', type: 'on', wordReading: 'けんせつ', wordRomaji: 'kensetsu', parts: [
      { text: '建', reading: 'けん', romaji: 'ken', meaning: 'xây', role: 'target' }, { text: '設', reading: 'せつ', romaji: 'setsu', meaning: 'thiết lập', role: 'support' }] },
    { word: '建てる', mean: 'xây lên', target: '建', answer: 'た', romaji: 'ta', type: 'kun', wordReading: 'たてる', wordRomaji: 'tateru', parts: [
      { text: '建', reading: 'た', romaji: 'ta', meaning: 'xây', role: 'target' }, { text: 'てる', reading: 'てる', romaji: 'teru', meaning: '', role: 'kana' }] },
    // 験
    { word: '試験', mean: 'kỳ thi / kiểm tra', target: '験', answer: 'けん', romaji: 'ken', type: 'on', wordReading: 'しけん', wordRomaji: 'shiken', parts: [
      { text: '試', reading: 'し', romaji: 'shi', meaning: 'thử', role: 'support' }, { text: '験', reading: 'けん', romaji: 'ken', meaning: 'kiểm nghiệm', role: 'target' }] },
    { word: '経験', mean: 'kinh nghiệm', target: '験', answer: 'けん', romaji: 'ken', type: 'on', wordReading: 'けいけん', wordRomaji: 'keiken', parts: [
      { text: '経', reading: 'けい', romaji: 'kei', meaning: 'trải qua', role: 'support' }, { text: '験', reading: 'けん', romaji: 'ken', meaning: 'kinh nghiệm', role: 'target' }] },
    // 元
    { word: '元気', mean: 'khỏe mạnh / tràn đầy năng lượng', target: '元', answer: 'げん', romaji: 'gen', type: 'on', wordReading: 'げんき', wordRomaji: 'genki', parts: [
      { text: '元', reading: 'げん', romaji: 'gen', meaning: 'nguồn / gốc', role: 'target' }, { text: '気', reading: 'き', romaji: 'ki', meaning: 'khí lực', role: 'support' }] },
    { word: '元', mean: 'gốc / nguồn', target: '元', answer: 'もと', romaji: 'moto', type: 'kun', wordReading: 'もと', wordRomaji: 'moto', parts: [
      { text: '元', reading: 'もと', romaji: 'moto', meaning: 'gốc', role: 'target' }] },
    // 工
    { word: '工場', mean: 'nhà máy', target: '工', answer: 'こう', romaji: 'kou', type: 'on', wordReading: 'こうじょう', wordRomaji: 'koujou', parts: [
      { text: '工', reading: 'こう', romaji: 'kou', meaning: 'công nghiệp', role: 'target' }, { text: '場', reading: 'じょう', romaji: 'jou', meaning: 'nơi', role: 'support' }] },
    { word: '工事', mean: 'công trình / thi công', target: '工', answer: 'こう', romaji: 'kou', type: 'on', wordReading: 'こうじ', wordRomaji: 'kouji', parts: [
      { text: '工', reading: 'こう', romaji: 'kou', meaning: 'thi công', role: 'target' }, { text: '事', reading: 'じ', romaji: 'ji', meaning: 'việc', role: 'support' }] },
    // 広
    { word: '広告', mean: 'quảng cáo', target: '広', answer: 'こう', romaji: 'kou', type: 'on', wordReading: 'こうこく', wordRomaji: 'koukoku', parts: [
      { text: '広', reading: 'こう', romaji: 'kou', meaning: 'rộng / quảng', role: 'target' }, { text: '告', reading: 'こく', romaji: 'koku', meaning: 'báo', role: 'support' }] },
    { word: '広い', mean: 'rộng', target: '広', answer: 'ひろ', romaji: 'hiro', type: 'kun', wordReading: 'ひろい', wordRomaji: 'hiroi', parts: [
      { text: '広', reading: 'ひろ', romaji: 'hiro', meaning: 'rộng', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 考
    { word: '考察', mean: 'suy xét / khảo sát', target: '考', answer: 'こう', romaji: 'kou', type: 'on', wordReading: 'こうさつ', wordRomaji: 'kousatsu', parts: [
      { text: '考', reading: 'こう', romaji: 'kou', meaning: 'suy nghĩ', role: 'target' }, { text: '察', reading: 'さつ', romaji: 'satsu', meaning: 'xem xét', role: 'support' }] },
    { word: '考える', mean: 'suy nghĩ', target: '考', answer: 'かんが', romaji: 'kanga', type: 'kun', wordReading: 'かんがえる', wordRomaji: 'kangaeru', parts: [
      { text: '考', reading: 'かんが', romaji: 'kanga', meaning: 'suy nghĩ', role: 'target' }, { text: 'える', reading: 'える', romaji: 'eru', meaning: '', role: 'kana' }] },
    // 光
    { word: '観光', mean: 'tham quan / du lịch', target: '光', answer: 'こう', romaji: 'kou', type: 'on', wordReading: 'かんこう', wordRomaji: 'kankou', parts: [
      { text: '観', reading: 'かん', romaji: 'kan', meaning: 'ngắm', role: 'support' }, { text: '光', reading: 'こう', romaji: 'kou', meaning: 'ánh sáng / cảnh sắc', role: 'target' }] },
    { word: '光', mean: 'ánh sáng', target: '光', answer: 'ひかり', romaji: 'hikari', type: 'kun', wordReading: 'ひかり', wordRomaji: 'hikari', parts: [
      { text: '光', reading: 'ひかり', romaji: 'hikari', meaning: 'ánh sáng', role: 'target' }] },
    // 好
    { word: '好物', mean: 'món yêu thích', target: '好', answer: 'こう', romaji: 'kou', type: 'on', wordReading: 'こうぶつ', wordRomaji: 'koubutsu', parts: [
      { text: '好', reading: 'こう', romaji: 'kou', meaning: 'yêu thích', role: 'target' }, { text: '物', reading: 'ぶつ', romaji: 'butsu', meaning: 'vật / món', role: 'support' }] },
    { word: '好き', mean: 'thích', target: '好', answer: 'す', romaji: 'su', type: 'kun', wordReading: 'すき', wordRomaji: 'suki', parts: [
      { text: '好', reading: 'す', romaji: 'su', meaning: 'thích', role: 'target' }, { text: 'き', reading: 'き', romaji: 'ki', meaning: '', role: 'kana' }] },
    // 合
    { word: '合計', mean: 'tổng cộng', target: '合', answer: 'ごう', romaji: 'gou', type: 'on', wordReading: 'ごうけい', wordRomaji: 'goukei', parts: [
      { text: '合', reading: 'ごう', romaji: 'gou', meaning: 'gộp', role: 'target' }, { text: '計', reading: 'けい', romaji: 'kei', meaning: 'tính', role: 'support' }] },
    { word: '合う', mean: 'hợp / khớp', target: '合', answer: 'あ', romaji: 'a', type: 'kun', wordReading: 'あう', wordRomaji: 'au', parts: [
      { text: '合', reading: 'あ', romaji: 'a', meaning: 'hợp', role: 'target' }, { text: 'う', reading: 'う', romaji: 'u', meaning: '', role: 'kana' }] },
    // 黒
    { word: '黒板', mean: 'bảng đen', target: '黒', answer: 'こく', romaji: 'koku', type: 'on', wordReading: 'こくばん', wordRomaji: 'kokuban', parts: [
      { text: '黒', reading: 'こく', romaji: 'koku', meaning: 'đen', role: 'target' }, { text: '板', reading: 'ばん', romaji: 'ban', meaning: 'tấm bảng', role: 'support' }] },
    { word: '黒い', mean: 'màu đen', target: '黒', answer: 'くろ', romaji: 'kuro', type: 'kun', wordReading: 'くろい', wordRomaji: 'kuroi', parts: [
      { text: '黒', reading: 'くろ', romaji: 'kuro', meaning: 'đen', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 菜
    { word: '野菜', mean: 'rau củ', target: '菜', answer: 'さい', romaji: 'sai', type: 'on', wordReading: 'やさい', wordRomaji: 'yasai', parts: [
      { text: '野', reading: 'や', romaji: 'ya', meaning: 'đồng / hoang', role: 'support' }, { text: '菜', reading: 'さい', romaji: 'sai', meaning: 'rau', role: 'target' }] },
    { word: '菜の花', mean: 'hoa cải', target: '菜', answer: 'な', romaji: 'na', type: 'kun', wordReading: 'なのはな', wordRomaji: 'nanohana', parts: [
      { text: '菜', reading: 'な', romaji: 'na', meaning: 'rau cải', role: 'target' }, { text: 'の', reading: 'の', romaji: 'no', meaning: '', role: 'kana' }, { text: '花', reading: 'はな', romaji: 'hana', meaning: 'hoa', role: 'support' }] },
    // 作
    { word: '作文', mean: 'bài văn', target: '作', answer: 'さく', romaji: 'saku', type: 'on', wordReading: 'さくぶん', wordRomaji: 'sakubun', parts: [
      { text: '作', reading: 'さく', romaji: 'saku', meaning: 'làm / sáng tác', role: 'target' }, { text: '文', reading: 'ぶん', romaji: 'bun', meaning: 'văn', role: 'support' }] },
    { word: '作る', mean: 'làm / tạo ra', target: '作', answer: 'つく', romaji: 'tsuku', type: 'kun', wordReading: 'つくる', wordRomaji: 'tsukuru', parts: [
      { text: '作', reading: 'つく', romaji: 'tsuku', meaning: 'làm', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 産
    { word: '生産', mean: 'sản xuất', target: '産', answer: 'さん', romaji: 'san', type: 'on', wordReading: 'せいさん', wordRomaji: 'seisan', parts: [
      { text: '生', reading: 'せい', romaji: 'sei', meaning: 'sinh ra', role: 'support' }, { text: '産', reading: 'さん', romaji: 'san', meaning: 'sản xuất', role: 'target' }] },
    { word: '産む', mean: 'sinh / đẻ', target: '産', answer: 'う', romaji: 'u', type: 'kun', wordReading: 'うむ', wordRomaji: 'umu', parts: [
      { text: '産', reading: 'う', romaji: 'u', meaning: 'sinh', role: 'target' }, { text: 'む', reading: 'む', romaji: 'mu', meaning: '', role: 'kana' }] },
    // 紙
    { word: '用紙', mean: 'giấy dùng cho một mục đích', target: '紙', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'ようし', wordRomaji: 'youshi', parts: [
      { text: '用', reading: 'よう', romaji: 'you', meaning: 'sử dụng', role: 'support' }, { text: '紙', reading: 'し', romaji: 'shi', meaning: 'giấy', role: 'target' }] },
    { word: '紙', mean: 'giấy', target: '紙', answer: 'かみ', romaji: 'kami', type: 'kun', wordReading: 'かみ', wordRomaji: 'kami', parts: [
      { text: '紙', reading: 'かみ', romaji: 'kami', meaning: 'giấy', role: 'target' }] },
    // 思
    { word: '思考', mean: 'suy nghĩ / tư duy', target: '思', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'しこう', wordRomaji: 'shikou', parts: [
      { text: '思', reading: 'し', romaji: 'shi', meaning: 'suy nghĩ', role: 'target' }, { text: '考', reading: 'こう', romaji: 'kou', meaning: 'xem xét', role: 'support' }] },
    { word: '思う', mean: 'nghĩ / cảm thấy', target: '思', answer: 'おも', romaji: 'omo', type: 'kun', wordReading: 'おもう', wordRomaji: 'omou', parts: [
      { text: '思', reading: 'おも', romaji: 'omo', meaning: 'nghĩ', role: 'target' }, { text: 'う', reading: 'う', romaji: 'u', meaning: '', role: 'kana' }] },
    // 姉
    { word: '姉妹', mean: 'chị em gái', target: '姉', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'しまい', wordRomaji: 'shimai', parts: [
      { text: '姉', reading: 'し', romaji: 'shi', meaning: 'chị gái', role: 'target' }, { text: '妹', reading: 'まい', romaji: 'mai', meaning: 'em gái', role: 'support' }] },
    { word: '姉', mean: 'chị gái', target: '姉', answer: 'あね', romaji: 'ane', type: 'kun', wordReading: 'あね', wordRomaji: 'ane', parts: [
      { text: '姉', reading: 'あね', romaji: 'ane', meaning: 'chị gái', role: 'target' }] },
    // 止
    { word: '停止', mean: 'dừng lại / đình chỉ', target: '止', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'ていし', wordRomaji: 'teishi', parts: [
      { text: '停', reading: 'てい', romaji: 'tei', meaning: 'dừng', role: 'support' }, { text: '止', reading: 'し', romaji: 'shi', meaning: 'dừng', role: 'target' }] },
    { word: '止まる', mean: 'dừng lại', target: '止', answer: 'と', romaji: 'to', type: 'kun', wordReading: 'とまる', wordRomaji: 'tomaru', parts: [
      { text: '止', reading: 'と', romaji: 'to', meaning: 'dừng', role: 'target' }, { text: 'まる', reading: 'まる', romaji: 'maru', meaning: '', role: 'kana' }] },
    // 市
    { word: '市場', mean: 'chợ / thị trường', target: '市', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'しじょう', wordRomaji: 'shijou', parts: [
      { text: '市', reading: 'し', romaji: 'shi', meaning: 'chợ', role: 'target' }, { text: '場', reading: 'じょう', romaji: 'jou', meaning: 'nơi', role: 'support' }] },
    { word: '市', mean: 'chợ phiên', target: '市', answer: 'いち', romaji: 'ichi', type: 'kun', wordReading: 'いち', wordRomaji: 'ichi', parts: [
      { text: '市', reading: 'いち', romaji: 'ichi', meaning: 'chợ', role: 'target' }] },
    // 仕
    { word: '仕事', mean: 'công việc', target: '仕', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'しごと', wordRomaji: 'shigoto', parts: [
      { text: '仕', reading: 'し', romaji: 'shi', meaning: 'làm việc', role: 'target' }, { text: '事', reading: 'ごと', romaji: 'goto', meaning: 'việc', role: 'support' }] },
    { word: '仕える', mean: 'phụng sự / phục vụ', target: '仕', answer: 'つか', romaji: 'tsuka', type: 'kun', wordReading: 'つかえる', wordRomaji: 'tsukaeru', parts: [
      { text: '仕', reading: 'つか', romaji: 'tsuka', meaning: 'phụng sự', role: 'target' }, { text: 'える', reading: 'える', romaji: 'eru', meaning: '', role: 'kana' }] },
    // 死
    { word: '死亡', mean: 'tử vong', target: '死', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'しぼう', wordRomaji: 'shibou', parts: [
      { text: '死', reading: 'し', romaji: 'shi', meaning: 'chết', role: 'target' }, { text: '亡', reading: 'ぼう', romaji: 'bou', meaning: 'mất', role: 'support' }] },
    { word: '死ぬ', mean: 'chết', target: '死', answer: 'し', romaji: 'shi', type: 'kun', wordReading: 'しぬ', wordRomaji: 'shinu', parts: [
      { text: '死', reading: 'し', romaji: 'shi', meaning: 'chết', role: 'target' }, { text: 'ぬ', reading: 'ぬ', romaji: 'nu', meaning: '', role: 'kana' }] },
    // 使
    { word: '使用', mean: 'sử dụng', target: '使', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'しよう', wordRomaji: 'shiyou', parts: [
      { text: '使', reading: 'し', romaji: 'shi', meaning: 'dùng', role: 'target' }, { text: '用', reading: 'よう', romaji: 'you', meaning: 'sử dụng', role: 'support' }] },
    { word: '使う', mean: 'dùng / sử dụng', target: '使', answer: 'つか', romaji: 'tsuka', type: 'kun', wordReading: 'つかう', wordRomaji: 'tsukau', parts: [
      { text: '使', reading: 'つか', romaji: 'tsuka', meaning: 'dùng', role: 'target' }, { text: 'う', reading: 'う', romaji: 'u', meaning: '', role: 'kana' }] },
    // 始
    { word: '開始', mean: 'bắt đầu / khai mạc', target: '始', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'かいし', wordRomaji: 'kaishi', parts: [
      { text: '開', reading: 'かい', romaji: 'kai', meaning: 'mở', role: 'support' }, { text: '始', reading: 'し', romaji: 'shi', meaning: 'bắt đầu', role: 'target' }] },
    { word: '始める', mean: 'bắt đầu', target: '始', answer: 'はじ', romaji: 'haji', type: 'kun', wordReading: 'はじめる', wordRomaji: 'hajimeru', parts: [
      { text: '始', reading: 'はじ', romaji: 'haji', meaning: 'bắt đầu', role: 'target' }, { text: 'める', reading: 'める', romaji: 'meru', meaning: '', role: 'kana' }] },
    // 試
    { word: '試験', mean: 'kỳ thi / kiểm tra', target: '試', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'しけん', wordRomaji: 'shiken', parts: [
      { text: '試', reading: 'し', romaji: 'shi', meaning: 'thử', role: 'target' }, { text: '験', reading: 'けん', romaji: 'ken', meaning: 'kiểm nghiệm', role: 'support' }] },
    { word: '試す', mean: 'thử', target: '試', answer: 'ため', romaji: 'tame', type: 'kun', wordReading: 'ためす', wordRomaji: 'tamesu', parts: [
      { text: '試', reading: 'ため', romaji: 'tame', meaning: 'thử', role: 'target' }, { text: 'す', reading: 'す', romaji: 'su', meaning: '', role: 'kana' }] },
    // 私
    { word: '私立', mean: 'tư lập', target: '私', answer: 'し', romaji: 'shi', type: 'on', wordReading: 'しりつ', wordRomaji: 'shiritsu', parts: [
      { text: '私', reading: 'し', romaji: 'shi', meaning: 'tư nhân', role: 'target' }, { text: '立', reading: 'りつ', romaji: 'ritsu', meaning: 'lập', role: 'support' }] },
    { word: '私', mean: 'tôi', target: '私', answer: 'わたし', romaji: 'watashi', type: 'kun', wordReading: 'わたし', wordRomaji: 'watashi', parts: [
      { text: '私', reading: 'わたし', romaji: 'watashi', meaning: 'tôi', role: 'target' }] },
    // 字
    { word: '文字', mean: 'chữ viết / ký tự', target: '字', answer: 'じ', romaji: 'ji', type: 'on', wordReading: 'もじ', wordRomaji: 'moji', parts: [
      { text: '文', reading: 'も', romaji: 'mo', meaning: 'văn', role: 'support' }, { text: '字', reading: 'じ', romaji: 'ji', meaning: 'chữ', role: 'target' }] },
    { word: '漢字', mean: 'chữ Kanji', target: '字', answer: 'じ', romaji: 'ji', type: 'on', wordReading: 'かんじ', wordRomaji: 'kanji', parts: [
      { text: '漢', reading: 'かん', romaji: 'kan', meaning: 'Hán', role: 'support' }, { text: '字', reading: 'じ', romaji: 'ji', meaning: 'chữ', role: 'target' }] },
    // 自
    { word: '自分', mean: 'bản thân', target: '自', answer: 'じ', romaji: 'ji', type: 'on', wordReading: 'じぶん', wordRomaji: 'jibun', parts: [
      { text: '自', reading: 'じ', romaji: 'ji', meaning: 'tự mình', role: 'target' }, { text: '分', reading: 'ぶん', romaji: 'bun', meaning: 'phần', role: 'support' }] },
    { word: '自ら', mean: 'tự mình', target: '自', answer: 'みずか', romaji: 'mizuka', type: 'kun', wordReading: 'みずから', wordRomaji: 'mizukara', parts: [
      { text: '自', reading: 'みずか', romaji: 'mizuka', meaning: 'tự mình', role: 'target' }, { text: 'ら', reading: 'ら', romaji: 'ra', meaning: '', role: 'kana' }] },
    // 事
    { word: '事故', mean: 'sự cố / tai nạn', target: '事', answer: 'じ', romaji: 'ji', type: 'on', wordReading: 'じこ', wordRomaji: 'jiko', parts: [
      { text: '事', reading: 'じ', romaji: 'ji', meaning: 'sự việc', role: 'target' }, { text: '故', reading: 'こ', romaji: 'ko', meaning: 'sự cố', role: 'support' }] },
    { word: '仕事', mean: 'công việc', target: '事', answer: 'ごと', romaji: 'goto', type: 'kun', wordReading: 'しごと', wordRomaji: 'shigoto', parts: [
      { text: '仕', reading: 'し', romaji: 'shi', meaning: 'làm', role: 'support' }, { text: '事', reading: 'ごと', romaji: 'goto', meaning: 'việc', role: 'target' }] },
    // 持
    { word: '持参', mean: 'mang theo', target: '持', answer: 'じ', romaji: 'ji', type: 'on', wordReading: 'じさん', wordRomaji: 'jisan', parts: [
      { text: '持', reading: 'じ', romaji: 'ji', meaning: 'mang', role: 'target' }, { text: '参', reading: 'さん', romaji: 'san', meaning: 'đến / tham gia', role: 'support' }] },
    { word: '持つ', mean: 'cầm / giữ', target: '持', answer: 'も', romaji: 'mo', type: 'kun', wordReading: 'もつ', wordRomaji: 'motsu', parts: [
      { text: '持', reading: 'も', romaji: 'mo', meaning: 'cầm', role: 'target' }, { text: 'つ', reading: 'つ', romaji: 'tsu', meaning: '', role: 'kana' }] },
    // 室
    { word: '教室', mean: 'lớp học', target: '室', answer: 'しつ', romaji: 'shitsu', type: 'on', wordReading: 'きょうしつ', wordRomaji: 'kyoushitsu', parts: [
      { text: '教', reading: 'きょう', romaji: 'kyou', meaning: 'dạy', role: 'support' }, { text: '室', reading: 'しつ', romaji: 'shitsu', meaning: 'phòng', role: 'target' }] },
    { word: '室内', mean: 'trong phòng', target: '室', answer: 'しつ', romaji: 'shitsu', type: 'on', wordReading: 'しつない', wordRomaji: 'shitsunai', parts: [
      { text: '室', reading: 'しつ', romaji: 'shitsu', meaning: 'phòng', role: 'target' }, { text: '内', reading: 'ない', romaji: 'nai', meaning: 'bên trong', role: 'support' }] },
    // 質
    { word: '品質', mean: 'chất lượng', target: '質', answer: 'しつ', romaji: 'shitsu', type: 'on', wordReading: 'ひんしつ', wordRomaji: 'hinshitsu', parts: [
      { text: '品', reading: 'ひん', romaji: 'hin', meaning: 'sản phẩm', role: 'support' }, { text: '質', reading: 'しつ', romaji: 'shitsu', meaning: 'chất lượng', role: 'target' }] },
    { word: '質問', mean: 'câu hỏi', target: '質', answer: 'しつ', romaji: 'shitsu', type: 'on', wordReading: 'しつもん', wordRomaji: 'shitsumon', parts: [
      { text: '質', reading: 'しつ', romaji: 'shitsu', meaning: 'hỏi / chất vấn', role: 'target' }, { text: '問', reading: 'もん', romaji: 'mon', meaning: 'hỏi', role: 'support' }] },
    // 写
    { word: '写真', mean: 'ảnh chụp', target: '写', answer: 'しゃ', romaji: 'sha', type: 'on', wordReading: 'しゃしん', wordRomaji: 'shashin', parts: [
      { text: '写', reading: 'しゃ', romaji: 'sha', meaning: 'chụp / sao', role: 'target' }, { text: '真', reading: 'しん', romaji: 'shin', meaning: 'thật', role: 'support' }] },
    { word: '写す', mean: 'chụp / sao chép', target: '写', answer: 'うつ', romaji: 'utsu', type: 'kun', wordReading: 'うつす', wordRomaji: 'utsusu', parts: [
      { text: '写', reading: 'うつ', romaji: 'utsu', meaning: 'chụp / sao', role: 'target' }, { text: 'す', reading: 'す', romaji: 'su', meaning: '', role: 'kana' }] },
    // 者
    { word: '記者', mean: 'phóng viên', target: '者', answer: 'しゃ', romaji: 'sha', type: 'on', wordReading: 'きしゃ', wordRomaji: 'kisha', parts: [
      { text: '記', reading: 'き', romaji: 'ki', meaning: 'ghi chép', role: 'support' }, { text: '者', reading: 'しゃ', romaji: 'sha', meaning: 'người', role: 'target' }] },
    { word: '若者', mean: 'người trẻ', target: '者', answer: 'もの', romaji: 'mono', type: 'kun', wordReading: 'わかもの', wordRomaji: 'wakamono', parts: [
      { text: '若', reading: 'わか', romaji: 'waka', meaning: 'trẻ', role: 'support' }, { text: '者', reading: 'もの', romaji: 'mono', meaning: 'người', role: 'target' }] },
    // 借
    { word: '借金', mean: 'khoản nợ / tiền vay', target: '借', answer: 'しゃっ', romaji: 'sha', type: 'on', wordReading: 'しゃっきん', wordRomaji: 'shakkin', parts: [
      { text: '借', reading: 'しゃっ', romaji: 'sha', meaning: 'vay', role: 'target' }, { text: '金', reading: 'きん', romaji: 'kin', meaning: 'tiền', role: 'support' }] },
    { word: '借りる', mean: 'mượn / vay', target: '借', answer: 'か', romaji: 'ka', type: 'kun', wordReading: 'かりる', wordRomaji: 'kariru', parts: [
      { text: '借', reading: 'か', romaji: 'ka', meaning: 'mượn', role: 'target' }, { text: 'りる', reading: 'りる', romaji: 'riru', meaning: '', role: 'kana' }] },
    // 弱
    { word: '弱点', mean: 'điểm yếu', target: '弱', answer: 'じゃく', romaji: 'jaku', type: 'on', wordReading: 'じゃくてん', wordRomaji: 'jakuten', parts: [
      { text: '弱', reading: 'じゃく', romaji: 'jaku', meaning: 'yếu', role: 'target' }, { text: '点', reading: 'てん', romaji: 'ten', meaning: 'điểm', role: 'support' }] },
    { word: '弱い', mean: 'yếu', target: '弱', answer: 'よわ', romaji: 'yowa', type: 'kun', wordReading: 'よわい', wordRomaji: 'yowai', parts: [
      { text: '弱', reading: 'よわ', romaji: 'yowa', meaning: 'yếu', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 首
    { word: '首都', mean: 'thủ đô', target: '首', answer: 'しゅ', romaji: 'shu', type: 'on', wordReading: 'しゅと', wordRomaji: 'shuto', parts: [
      { text: '首', reading: 'しゅ', romaji: 'shu', meaning: 'đầu / chính', role: 'target' }, { text: '都', reading: 'と', romaji: 'to', meaning: 'đô thị', role: 'support' }] },
    { word: '首', mean: 'cổ', target: '首', answer: 'くび', romaji: 'kubi', type: 'kun', wordReading: 'くび', wordRomaji: 'kubi', parts: [
      { text: '首', reading: 'くび', romaji: 'kubi', meaning: 'cổ', role: 'target' }] },
    // 主
    { word: '主人', mean: 'chủ nhà / chồng', target: '主', answer: 'しゅ', romaji: 'shu', type: 'on', wordReading: 'しゅじん', wordRomaji: 'shujin', parts: [
      { text: '主', reading: 'しゅ', romaji: 'shu', meaning: 'chủ', role: 'target' }, { text: '人', reading: 'じん', romaji: 'jin', meaning: 'người', role: 'support' }] },
    { word: '主な', mean: 'chính / chủ yếu', target: '主', answer: 'おも', romaji: 'omo', type: 'kun', wordReading: 'おもな', wordRomaji: 'omona', parts: [
      { text: '主', reading: 'おも', romaji: 'omo', meaning: 'chính', role: 'target' }, { text: 'な', reading: 'な', romaji: 'na', meaning: '', role: 'kana' }] },
    // 秋
    { word: '秋分', mean: 'thu phân', target: '秋', answer: 'しゅう', romaji: 'shuu', type: 'on', wordReading: 'しゅうぶん', wordRomaji: 'shuubun', parts: [
      { text: '秋', reading: 'しゅう', romaji: 'shuu', meaning: 'mùa thu', role: 'target' }, { text: '分', reading: 'ぶん', romaji: 'bun', meaning: 'phân chia', role: 'support' }] },
    { word: '秋', mean: 'mùa thu', target: '秋', answer: 'あき', romaji: 'aki', type: 'kun', wordReading: 'あき', wordRomaji: 'aki', parts: [
      { text: '秋', reading: 'あき', romaji: 'aki', meaning: 'mùa thu', role: 'target' }] },
    // 集
    { word: '集合', mean: 'tập hợp', target: '集', answer: 'しゅう', romaji: 'shuu', type: 'on', wordReading: 'しゅうごう', wordRomaji: 'shuugou', parts: [
      { text: '集', reading: 'しゅう', romaji: 'shuu', meaning: 'tụ họp', role: 'target' }, { text: '合', reading: 'ごう', romaji: 'gou', meaning: 'hợp lại', role: 'support' }] },
    { word: '集める', mean: 'thu thập / tập hợp', target: '集', answer: 'あつ', romaji: 'atsu', type: 'kun', wordReading: 'あつめる', wordRomaji: 'atsumeru', parts: [
      { text: '集', reading: 'あつ', romaji: 'atsu', meaning: 'tập hợp', role: 'target' }, { text: 'める', reading: 'める', romaji: 'meru', meaning: '', role: 'kana' }] },
    // 習
    { word: '学習', mean: 'học tập', target: '習', answer: 'しゅう', romaji: 'shuu', type: 'on', wordReading: 'がくしゅう', wordRomaji: 'gakushuu', parts: [
      { text: '学', reading: 'がく', romaji: 'gaku', meaning: 'học', role: 'support' }, { text: '習', reading: 'しゅう', romaji: 'shuu', meaning: 'luyện tập', role: 'target' }] },
    { word: '習う', mean: 'học / luyện', target: '習', answer: 'なら', romaji: 'nara', type: 'kun', wordReading: 'ならう', wordRomaji: 'narau', parts: [
      { text: '習', reading: 'なら', romaji: 'nara', meaning: 'học', role: 'target' }, { text: 'う', reading: 'う', romaji: 'u', meaning: '', role: 'kana' }] },
    // 終
    { word: '終了', mean: 'kết thúc / hoàn tất', target: '終', answer: 'しゅう', romaji: 'shuu', type: 'on', wordReading: 'しゅうりょう', wordRomaji: 'shuuryou', parts: [
      { text: '終', reading: 'しゅう', romaji: 'shuu', meaning: 'kết thúc', role: 'target' }, { text: '了', reading: 'りょう', romaji: 'ryou', meaning: 'hoàn tất', role: 'support' }] },
    { word: '終わる', mean: 'kết thúc', target: '終', answer: 'お', romaji: 'o', type: 'kun', wordReading: 'おわる', wordRomaji: 'owaru', parts: [
      { text: '終', reading: 'お', romaji: 'o', meaning: 'kết thúc', role: 'target' }, { text: 'わる', reading: 'わる', romaji: 'waru', meaning: '', role: 'kana' }] },
    // 住
    { word: '住所', mean: 'địa chỉ', target: '住', answer: 'じゅう', romaji: 'juu', type: 'on', wordReading: 'じゅうしょ', wordRomaji: 'juusho', parts: [
      { text: '住', reading: 'じゅう', romaji: 'juu', meaning: 'cư trú', role: 'target' }, { text: '所', reading: 'しょ', romaji: 'sho', meaning: 'nơi', role: 'support' }] },
    { word: '住む', mean: 'sống / cư trú', target: '住', answer: 'す', romaji: 'su', type: 'kun', wordReading: 'すむ', wordRomaji: 'sumu', parts: [
      { text: '住', reading: 'す', romaji: 'su', meaning: 'sống', role: 'target' }, { text: 'む', reading: 'む', romaji: 'mu', meaning: '', role: 'kana' }] },
    // 重
    { word: '重要', mean: 'quan trọng', target: '重', answer: 'じゅう', romaji: 'juu', type: 'on', wordReading: 'じゅうよう', wordRomaji: 'juuyou', parts: [
      { text: '重', reading: 'じゅう', romaji: 'juu', meaning: 'quan trọng', role: 'target' }, { text: '要', reading: 'よう', romaji: 'you', meaning: 'thiết yếu', role: 'support' }] },
    { word: '重い', mean: 'nặng', target: '重', answer: 'おも', romaji: 'omo', type: 'kun', wordReading: 'おもい', wordRomaji: 'omoi', parts: [
      { text: '重', reading: 'おも', romaji: 'omo', meaning: 'nặng', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 春
    { word: '青春', mean: 'tuổi thanh xuân', target: '春', answer: 'しゅん', romaji: 'shun', type: 'on', wordReading: 'せいしゅん', wordRomaji: 'seishun', parts: [
      { text: '青', reading: 'せい', romaji: 'sei', meaning: 'xanh / trẻ', role: 'support' }, { text: '春', reading: 'しゅん', romaji: 'shun', meaning: 'mùa xuân', role: 'target' }] },
    { word: '春', mean: 'mùa xuân', target: '春', answer: 'はる', romaji: 'haru', type: 'kun', wordReading: 'はる', wordRomaji: 'haru', parts: [
      { text: '春', reading: 'はる', romaji: 'haru', meaning: 'mùa xuân', role: 'target' }] },
    // 所
    { word: '場所', mean: 'địa điểm / nơi chốn', target: '所', answer: 'しょ', romaji: 'sho', type: 'on', wordReading: 'ばしょ', wordRomaji: 'basho', parts: [
      { text: '場', reading: 'ば', romaji: 'ba', meaning: 'nơi', role: 'support' }, { text: '所', reading: 'しょ', romaji: 'sho', meaning: 'chỗ', role: 'target' }] },
    { word: '所', mean: 'nơi / chỗ', target: '所', answer: 'ところ', romaji: 'tokoro', type: 'kun', wordReading: 'ところ', wordRomaji: 'tokoro', parts: [
      { text: '所', reading: 'ところ', romaji: 'tokoro', meaning: 'nơi', role: 'target' }] },
    // 暑
    { word: '残暑', mean: 'cái nóng cuối hè', target: '暑', answer: 'しょ', romaji: 'sho', type: 'on', wordReading: 'ざんしょ', wordRomaji: 'zansho', parts: [
      { text: '残', reading: 'ざん', romaji: 'zan', meaning: 'còn lại', role: 'support' }, { text: '暑', reading: 'しょ', romaji: 'sho', meaning: 'nóng', role: 'target' }] },
    { word: '暑い', mean: 'nóng (thời tiết)', target: '暑', answer: 'あつ', romaji: 'atsu', type: 'kun', wordReading: 'あつい', wordRomaji: 'atsui', parts: [
      { text: '暑', reading: 'あつ', romaji: 'atsu', meaning: 'nóng', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 場
    { word: '会場', mean: 'hội trường / địa điểm tổ chức', target: '場', answer: 'じょう', romaji: 'jou', type: 'on', wordReading: 'かいじょう', wordRomaji: 'kaijou', parts: [
      { text: '会', reading: 'かい', romaji: 'kai', meaning: 'cuộc họp', role: 'support' }, { text: '場', reading: 'じょう', romaji: 'jou', meaning: 'địa điểm', role: 'target' }] },
    { word: '場所', mean: 'địa điểm / nơi chốn', target: '場', answer: 'ば', romaji: 'ba', type: 'kun', wordReading: 'ばしょ', wordRomaji: 'basho', parts: [
      { text: '場', reading: 'ば', romaji: 'ba', meaning: 'nơi', role: 'target' }, { text: '所', reading: 'しょ', romaji: 'sho', meaning: 'chỗ', role: 'support' }] },
    // 乗
    { word: '乗車', mean: 'lên xe', target: '乗', answer: 'じょう', romaji: 'jou', type: 'on', wordReading: 'じょうしゃ', wordRomaji: 'jousha', parts: [
      { text: '乗', reading: 'じょう', romaji: 'jou', meaning: 'lên', role: 'target' }, { text: '車', reading: 'しゃ', romaji: 'sha', meaning: 'xe', role: 'support' }] },
    { word: '乗る', mean: 'lên / đi bằng phương tiện', target: '乗', answer: 'の', romaji: 'no', type: 'kun', wordReading: 'のる', wordRomaji: 'noru', parts: [
      { text: '乗', reading: 'の', romaji: 'no', meaning: 'lên xe', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 色
    { word: '色彩', mean: 'màu sắc / sắc thái', target: '色', answer: 'しき', romaji: 'shiki', type: 'on', wordReading: 'しきさい', wordRomaji: 'shikisai', parts: [
      { text: '色', reading: 'しき', romaji: 'shiki', meaning: 'màu sắc', role: 'target' }, { text: '彩', reading: 'さい', romaji: 'sai', meaning: 'sắc màu', role: 'support' }] },
    { word: '色', mean: 'màu sắc', target: '色', answer: 'いろ', romaji: 'iro', type: 'kun', wordReading: 'いろ', wordRomaji: 'iro', parts: [
      { text: '色', reading: 'いろ', romaji: 'iro', meaning: 'màu sắc', role: 'target' }] },
    // 森
    { word: '森林', mean: 'rừng cây', target: '森', answer: 'しん', romaji: 'shin', type: 'on', wordReading: 'しんりん', wordRomaji: 'shinrin', parts: [
      { text: '森', reading: 'しん', romaji: 'shin', meaning: 'rừng', role: 'target' }, { text: '林', reading: 'りん', romaji: 'rin', meaning: 'lùm cây', role: 'support' }] },
    { word: '森', mean: 'rừng', target: '森', answer: 'もり', romaji: 'mori', type: 'kun', wordReading: 'もり', wordRomaji: 'mori', parts: [
      { text: '森', reading: 'もり', romaji: 'mori', meaning: 'rừng', role: 'target' }] },
    // 心
    { word: '心配', mean: 'lo lắng', target: '心', answer: 'しん', romaji: 'shin', type: 'on', wordReading: 'しんぱい', wordRomaji: 'shinpai', parts: [
      { text: '心', reading: 'しん', romaji: 'shin', meaning: 'tâm trí', role: 'target' }, { text: '配', reading: 'ぱい', romaji: 'pai', meaning: 'quan tâm', role: 'support' }] },
    { word: '心', mean: 'trái tim / tâm hồn', target: '心', answer: 'こころ', romaji: 'kokoro', type: 'kun', wordReading: 'こころ', wordRomaji: 'kokoro', parts: [
      { text: '心', reading: 'こころ', romaji: 'kokoro', meaning: 'trái tim', role: 'target' }] },
    // 親
    { word: '親切', mean: 'tử tế / tốt bụng', target: '親', answer: 'しん', romaji: 'shin', type: 'on', wordReading: 'しんせつ', wordRomaji: 'shinsetsu', parts: [
      { text: '親', reading: 'しん', romaji: 'shin', meaning: 'thân thiết', role: 'target' }, { text: '切', reading: 'せつ', romaji: 'setsu', meaning: 'tận tình', role: 'support' }] },
    { word: '親', mean: 'cha mẹ', target: '親', answer: 'おや', romaji: 'oya', type: 'kun', wordReading: 'おや', wordRomaji: 'oya', parts: [
      { text: '親', reading: 'おや', romaji: 'oya', meaning: 'cha mẹ', role: 'target' }] },
    // 真
    { word: '写真', mean: 'ảnh chụp', target: '真', answer: 'しん', romaji: 'shin', type: 'on', wordReading: 'しゃしん', wordRomaji: 'shashin', parts: [
      { text: '写', reading: 'しゃ', romaji: 'sha', meaning: 'chụp', role: 'support' }, { text: '真', reading: 'しん', romaji: 'shin', meaning: 'thật', role: 'target' }] },
    { word: '真っ白', mean: 'trắng tinh', target: '真', answer: 'ま', romaji: 'ma', type: 'kun', wordReading: 'まっしろ', wordRomaji: 'masshiro', parts: [
      { text: '真', reading: 'ま', romaji: 'ma', meaning: 'hoàn toàn', role: 'target' }, { text: 'っ', reading: 'っ', romaji: '', meaning: '', role: 'kana' }, { text: '白', reading: 'しろ', romaji: 'shiro', meaning: 'trắng', role: 'support' }] },
    // 進
    { word: '進学', mean: 'học lên', target: '進', answer: 'しん', romaji: 'shin', type: 'on', wordReading: 'しんがく', wordRomaji: 'shingaku', parts: [
      { text: '進', reading: 'しん', romaji: 'shin', meaning: 'tiến lên', role: 'target' }, { text: '学', reading: 'がく', romaji: 'gaku', meaning: 'học', role: 'support' }] },
    { word: '進む', mean: 'tiến lên', target: '進', answer: 'すす', romaji: 'susu', type: 'kun', wordReading: 'すすむ', wordRomaji: 'susumu', parts: [
      { text: '進', reading: 'すす', romaji: 'susu', meaning: 'tiến', role: 'target' }, { text: 'む', reading: 'む', romaji: 'mu', meaning: '', role: 'kana' }] },
    // 図
    { word: '地図', mean: 'bản đồ', target: '図', answer: 'ず', romaji: 'zu', type: 'on', wordReading: 'ちず', wordRomaji: 'chizu', parts: [
      { text: '地', reading: 'ち', romaji: 'chi', meaning: 'đất', role: 'support' }, { text: '図', reading: 'ず', romaji: 'zu', meaning: 'bản đồ', role: 'target' }] },
    { word: '図書館', mean: 'thư viện', target: '図', answer: 'と', romaji: 'to', type: 'on', wordReading: 'としょかん', wordRomaji: 'toshokan', parts: [
      { text: '図', reading: 'と', romaji: 'to', meaning: 'sách / sơ đồ', role: 'target' }, { text: '書館', reading: 'しょかん', romaji: 'shokan', meaning: 'thư quán', role: 'support' }] },
    // 青
    { word: '青年', mean: 'thanh niên', target: '青', answer: 'せい', romaji: 'sei', type: 'on', wordReading: 'せいねん', wordRomaji: 'seinen', parts: [
      { text: '青', reading: 'せい', romaji: 'sei', meaning: 'xanh / trẻ', role: 'target' }, { text: '年', reading: 'ねん', romaji: 'nen', meaning: 'năm / tuổi', role: 'support' }] },
    { word: '青い', mean: 'màu xanh', target: '青', answer: 'あお', romaji: 'ao', type: 'kun', wordReading: 'あおい', wordRomaji: 'aoi', parts: [
      { text: '青', reading: 'あお', romaji: 'ao', meaning: 'xanh', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 正
    { word: '正解', mean: 'đáp án đúng', target: '正', answer: 'せい', romaji: 'sei', type: 'on', wordReading: 'せいかい', wordRomaji: 'seikai', parts: [
      { text: '正', reading: 'せい', romaji: 'sei', meaning: 'đúng', role: 'target' }, { text: '解', reading: 'かい', romaji: 'kai', meaning: 'giải', role: 'support' }] },
    { word: '正しい', mean: 'đúng đắn', target: '正', answer: 'ただ', romaji: 'tada', type: 'kun', wordReading: 'ただしい', wordRomaji: 'tadashii', parts: [
      { text: '正', reading: 'ただ', romaji: 'tada', meaning: 'đúng', role: 'target' }, { text: 'しい', reading: 'しい', romaji: 'shii', meaning: '', role: 'kana' }] },
    // 声
    { word: '音声', mean: 'âm thanh / giọng nói', target: '声', answer: 'せい', romaji: 'sei', type: 'on', wordReading: 'おんせい', wordRomaji: 'onsei', parts: [
      { text: '音', reading: 'おん', romaji: 'on', meaning: 'âm thanh', role: 'support' }, { text: '声', reading: 'せい', romaji: 'sei', meaning: 'giọng', role: 'target' }] },
    { word: '声', mean: 'giọng nói', target: '声', answer: 'こえ', romaji: 'koe', type: 'kun', wordReading: 'こえ', wordRomaji: 'koe', parts: [
      { text: '声', reading: 'こえ', romaji: 'koe', meaning: 'giọng nói', role: 'target' }] },
    // 世
    { word: '世界', mean: 'thế giới', target: '世', answer: 'せ', romaji: 'se', type: 'on', wordReading: 'せかい', wordRomaji: 'sekai', parts: [
      { text: '世', reading: 'せ', romaji: 'se', meaning: 'thế giới', role: 'target' }, { text: '界', reading: 'かい', romaji: 'kai', meaning: 'cõi / giới', role: 'support' }] },
    { word: '世の中', mean: 'xã hội / thế gian', target: '世', answer: 'よ', romaji: 'yo', type: 'kun', wordReading: 'よのなか', wordRomaji: 'yononaka', parts: [
      { text: '世', reading: 'よ', romaji: 'yo', meaning: 'thế gian', role: 'target' }, { text: 'の', reading: 'の', romaji: 'no', meaning: '', role: 'kana' }, { text: '中', reading: 'なか', romaji: 'naka', meaning: 'bên trong', role: 'support' }] },
    // 赤
    { word: '赤道', mean: 'xích đạo', target: '赤', answer: 'せき', romaji: 'seki', type: 'on', wordReading: 'せきどう', wordRomaji: 'sekidou', parts: [
      { text: '赤', reading: 'せき', romaji: 'seki', meaning: 'đỏ / xích', role: 'target' }, { text: '道', reading: 'どう', romaji: 'dou', meaning: 'đường', role: 'support' }] },
    { word: '赤い', mean: 'màu đỏ', target: '赤', answer: 'あか', romaji: 'aka', type: 'kun', wordReading: 'あかい', wordRomaji: 'akai', parts: [
      { text: '赤', reading: 'あか', romaji: 'aka', meaning: 'đỏ', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 夕
    { word: '夕食', mean: 'bữa tối', target: '夕', answer: 'ゆう', romaji: 'yuu', type: 'kun', wordReading: 'ゆうしょく', wordRomaji: 'yuushoku', parts: [
      { text: '夕', reading: 'ゆう', romaji: 'yuu', meaning: 'buổi tối', role: 'target' }, { text: '食', reading: 'しょく', romaji: 'shoku', meaning: 'bữa ăn', role: 'support' }] },
    { word: '夕方', mean: 'chiều tối', target: '夕', answer: 'ゆう', romaji: 'yuu', type: 'kun', wordReading: 'ゆうがた', wordRomaji: 'yuugata', parts: [
      { text: '夕', reading: 'ゆう', romaji: 'yuu', meaning: 'buổi tối', role: 'target' }, { text: '方', reading: 'がた', romaji: 'gata', meaning: 'phía / khoảng', role: 'support' }] },
    // 切
    { word: '大切', mean: 'quan trọng / quý giá', target: '切', answer: 'せつ', romaji: 'setsu', type: 'on', wordReading: 'たいせつ', wordRomaji: 'taisetsu', parts: [
      { text: '大', reading: 'たい', romaji: 'tai', meaning: 'lớn', role: 'support' }, { text: '切', reading: 'せつ', romaji: 'setsu', meaning: 'quan trọng', role: 'target' }] },
    { word: '切る', mean: 'cắt', target: '切', answer: 'き', romaji: 'ki', type: 'kun', wordReading: 'きる', wordRomaji: 'kiru', parts: [
      { text: '切', reading: 'き', romaji: 'ki', meaning: 'cắt', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 説
    { word: '説明', mean: 'giải thích', target: '説', answer: 'せつ', romaji: 'setsu', type: 'on', wordReading: 'せつめい', wordRomaji: 'setsumei', parts: [
      { text: '説', reading: 'せつ', romaji: 'setsu', meaning: 'giải thích', role: 'target' }, { text: '明', reading: 'めい', romaji: 'mei', meaning: 'rõ', role: 'support' }] },
    { word: '説く', mean: 'giảng giải / thuyết phục', target: '説', answer: 'と', romaji: 'to', type: 'kun', wordReading: 'とく', wordRomaji: 'toku', parts: [
      { text: '説', reading: 'と', romaji: 'to', meaning: 'giảng giải', role: 'target' }, { text: 'く', reading: 'く', romaji: 'ku', meaning: '', role: 'kana' }] },
    // 洗
    { word: '洗面所', mean: 'phòng rửa mặt', target: '洗', answer: 'せん', romaji: 'sen', type: 'on', wordReading: 'せんめんじょ', wordRomaji: 'senmenjo', parts: [
      { text: '洗', reading: 'せん', romaji: 'sen', meaning: 'rửa', role: 'target' }, { text: '面所', reading: 'めんじょ', romaji: 'menjo', meaning: 'nơi rửa mặt', role: 'support' }] },
    { word: '洗う', mean: 'rửa', target: '洗', answer: 'あら', romaji: 'ara', type: 'kun', wordReading: 'あらう', wordRomaji: 'arau', parts: [
      { text: '洗', reading: 'あら', romaji: 'ara', meaning: 'rửa', role: 'target' }, { text: 'う', reading: 'う', romaji: 'u', meaning: '', role: 'kana' }] },
    // 早
    { word: '早朝', mean: 'sáng sớm', target: '早', answer: 'そう', romaji: 'sou', type: 'on', wordReading: 'そうちょう', wordRomaji: 'souchou', parts: [
      { text: '早', reading: 'そう', romaji: 'sou', meaning: 'sớm', role: 'target' }, { text: '朝', reading: 'ちょう', romaji: 'chou', meaning: 'buổi sáng', role: 'support' }] },
    { word: '早い', mean: 'sớm / nhanh', target: '早', answer: 'はや', romaji: 'haya', type: 'kun', wordReading: 'はやい', wordRomaji: 'hayai', parts: [
      { text: '早', reading: 'はや', romaji: 'haya', meaning: 'sớm / nhanh', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 走
    { word: '競走', mean: 'cuộc chạy đua', target: '走', answer: 'そう', romaji: 'sou', type: 'on', wordReading: 'きょうそう', wordRomaji: 'kyousou', parts: [
      { text: '競', reading: 'きょう', romaji: 'kyou', meaning: 'thi đấu', role: 'support' }, { text: '走', reading: 'そう', romaji: 'sou', meaning: 'chạy', role: 'target' }] },
    { word: '走る', mean: 'chạy', target: '走', answer: 'はし', romaji: 'hashi', type: 'kun', wordReading: 'はしる', wordRomaji: 'hashiru', parts: [
      { text: '走', reading: 'はし', romaji: 'hashi', meaning: 'chạy', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 送
    { word: '送信', mean: 'gửi đi / truyền tin', target: '送', answer: 'そう', romaji: 'sou', type: 'on', wordReading: 'そうしん', wordRomaji: 'soushin', parts: [
      { text: '送', reading: 'そう', romaji: 'sou', meaning: 'gửi', role: 'target' }, { text: '信', reading: 'しん', romaji: 'shin', meaning: 'tin', role: 'support' }] },
    { word: '送る', mean: 'gửi / tiễn', target: '送', answer: 'おく', romaji: 'oku', type: 'kun', wordReading: 'おくる', wordRomaji: 'okuru', parts: [
      { text: '送', reading: 'おく', romaji: 'oku', meaning: 'gửi', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 族
    { word: '家族', mean: 'gia đình', target: '族', answer: 'ぞく', romaji: 'zoku', type: 'on', wordReading: 'かぞく', wordRomaji: 'kazoku', parts: [
      { text: '家', reading: 'か', romaji: 'ka', meaning: 'nhà', role: 'support' }, { text: '族', reading: 'ぞく', romaji: 'zoku', meaning: 'gia tộc', role: 'target' }] },
    { word: '民族', mean: 'dân tộc', target: '族', answer: 'ぞく', romaji: 'zoku', type: 'on', wordReading: 'みんぞく', wordRomaji: 'minzoku', parts: [
      { text: '民', reading: 'みん', romaji: 'min', meaning: 'người dân', role: 'support' }, { text: '族', reading: 'ぞく', romaji: 'zoku', meaning: 'nhóm / tộc', role: 'target' }] },
    // 村
    { word: '村民', mean: 'dân làng', target: '村', answer: 'そん', romaji: 'son', type: 'on', wordReading: 'そんみん', wordRomaji: 'sonmin', parts: [
      { text: '村', reading: 'そん', romaji: 'son', meaning: 'làng', role: 'target' }, { text: '民', reading: 'みん', romaji: 'min', meaning: 'người dân', role: 'support' }] },
    { word: '村', mean: 'ngôi làng', target: '村', answer: 'むら', romaji: 'mura', type: 'kun', wordReading: 'むら', wordRomaji: 'mura', parts: [
      { text: '村', reading: 'むら', romaji: 'mura', meaning: 'làng', role: 'target' }] },
    // 体
    { word: '体育', mean: 'thể dục', target: '体', answer: 'たい', romaji: 'tai', type: 'on', wordReading: 'たいいく', wordRomaji: 'taiiku', parts: [
      { text: '体', reading: 'たい', romaji: 'tai', meaning: 'cơ thể', role: 'target' }, { text: '育', reading: 'いく', romaji: 'iku', meaning: 'rèn luyện', role: 'support' }] },
    { word: '体', mean: 'cơ thể', target: '体', answer: 'からだ', romaji: 'karada', type: 'kun', wordReading: 'からだ', wordRomaji: 'karada', parts: [
      { text: '体', reading: 'からだ', romaji: 'karada', meaning: 'cơ thể', role: 'target' }] },
    // 太
    { word: '太陽', mean: 'mặt trời', target: '太', answer: 'たい', romaji: 'tai', type: 'on', wordReading: 'たいよう', wordRomaji: 'taiyou', parts: [
      { text: '太', reading: 'たい', romaji: 'tai', meaning: 'lớn / thái', role: 'target' }, { text: '陽', reading: 'よう', romaji: 'you', meaning: 'mặt trời', role: 'support' }] },
    { word: '太い', mean: 'to / dày', target: '太', answer: 'ふと', romaji: 'futo', type: 'kun', wordReading: 'ふとい', wordRomaji: 'futoi', parts: [
      { text: '太', reading: 'ふと', romaji: 'futo', meaning: 'to / dày', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 待
    { word: '待機', mean: 'chờ sẵn / đợi lệnh', target: '待', answer: 'たい', romaji: 'tai', type: 'on', wordReading: 'たいき', wordRomaji: 'taiki', parts: [
      { text: '待', reading: 'たい', romaji: 'tai', meaning: 'chờ', role: 'target' }, { text: '機', reading: 'き', romaji: 'ki', meaning: 'thời cơ / máy', role: 'support' }] },
    { word: '待つ', mean: 'chờ đợi', target: '待', answer: 'ま', romaji: 'ma', type: 'kun', wordReading: 'まつ', wordRomaji: 'matsu', parts: [
      { text: '待', reading: 'ま', romaji: 'ma', meaning: 'chờ', role: 'target' }, { text: 'つ', reading: 'つ', romaji: 'tsu', meaning: '', role: 'kana' }] },
    // 貸
    { word: '賃貸', mean: 'cho thuê / thuê nhà', target: '貸', answer: 'たい', romaji: 'tai', type: 'on', wordReading: 'ちんたい', wordRomaji: 'chintai', parts: [
      { text: '賃', reading: 'ちん', romaji: 'chin', meaning: 'tiền thuê', role: 'support' }, { text: '貸', reading: 'たい', romaji: 'tai', meaning: 'cho thuê', role: 'target' }] },
    { word: '貸す', mean: 'cho mượn', target: '貸', answer: 'か', romaji: 'ka', type: 'kun', wordReading: 'かす', wordRomaji: 'kasu', parts: [
      { text: '貸', reading: 'か', romaji: 'ka', meaning: 'cho mượn', role: 'target' }, { text: 'す', reading: 'す', romaji: 'su', meaning: '', role: 'kana' }] },
    // 台
    { word: '台風', mean: 'bão', target: '台', answer: 'たい', romaji: 'tai', type: 'on', wordReading: 'たいふう', wordRomaji: 'taifuu', parts: [
      { text: '台', reading: 'たい', romaji: 'tai', meaning: 'đài / bệ', role: 'target' }, { text: '風', reading: 'ふう', romaji: 'fuu', meaning: 'gió', role: 'support' }] },
    { word: '台所', mean: 'nhà bếp', target: '台', answer: 'だい', romaji: 'dai', type: 'on', wordReading: 'だいどころ', wordRomaji: 'daidokoro', parts: [
      { text: '台', reading: 'だい', romaji: 'dai', meaning: 'bệ / khu', role: 'target' }, { text: '所', reading: 'どころ', romaji: 'dokoro', meaning: 'nơi', role: 'support' }] },
    // 代
    { word: '時代', mean: 'thời đại', target: '代', answer: 'だい', romaji: 'dai', type: 'on', wordReading: 'じだい', wordRomaji: 'jidai', parts: [
      { text: '時', reading: 'じ', romaji: 'ji', meaning: 'thời gian', role: 'support' }, { text: '代', reading: 'だい', romaji: 'dai', meaning: 'đời / thời đại', role: 'target' }] },
    { word: '代わる', mean: 'thay thế', target: '代', answer: 'か', romaji: 'ka', type: 'kun', wordReading: 'かわる', wordRomaji: 'kawaru', parts: [
      { text: '代', reading: 'か', romaji: 'ka', meaning: 'thay thế', role: 'target' }, { text: 'わる', reading: 'わる', romaji: 'waru', meaning: '', role: 'kana' }] },
    // 題
    { word: '問題', mean: 'vấn đề / câu hỏi', target: '題', answer: 'だい', romaji: 'dai', type: 'on', wordReading: 'もんだい', wordRomaji: 'mondai', parts: [
      { text: '問', reading: 'もん', romaji: 'mon', meaning: 'hỏi', role: 'support' }, { text: '題', reading: 'だい', romaji: 'dai', meaning: 'đề bài', role: 'target' }] },
    { word: '宿題', mean: 'bài tập về nhà', target: '題', answer: 'だい', romaji: 'dai', type: 'on', wordReading: 'しゅくだい', wordRomaji: 'shukudai', parts: [
      { text: '宿', reading: 'しゅく', romaji: 'shuku', meaning: 'ở trọ / bài về nhà', role: 'support' }, { text: '題', reading: 'だい', romaji: 'dai', meaning: 'đề bài', role: 'target' }] },
    // 短
    { word: '短所', mean: 'khuyết điểm', target: '短', answer: 'たん', romaji: 'tan', type: 'on', wordReading: 'たんしょ', wordRomaji: 'tansho', parts: [
      { text: '短', reading: 'たん', romaji: 'tan', meaning: 'ngắn / điểm yếu', role: 'target' }, { text: '所', reading: 'しょ', romaji: 'sho', meaning: 'chỗ', role: 'support' }] },
    { word: '短い', mean: 'ngắn', target: '短', answer: 'みじか', romaji: 'mijika', type: 'kun', wordReading: 'みじかい', wordRomaji: 'mijikai', parts: [
      { text: '短', reading: 'みじか', romaji: 'mijika', meaning: 'ngắn', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 知
    { word: '知識', mean: 'kiến thức', target: '知', answer: 'ち', romaji: 'chi', type: 'on', wordReading: 'ちしき', wordRomaji: 'chishiki', parts: [
      { text: '知', reading: 'ち', romaji: 'chi', meaning: 'biết', role: 'target' }, { text: '識', reading: 'しき', romaji: 'shiki', meaning: 'nhận thức', role: 'support' }] },
    { word: '知る', mean: 'biết', target: '知', answer: 'し', romaji: 'shi', type: 'kun', wordReading: 'しる', wordRomaji: 'shiru', parts: [
      { text: '知', reading: 'し', romaji: 'shi', meaning: 'biết', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 地
    { word: '地下', mean: 'dưới lòng đất', target: '地', answer: 'ち', romaji: 'chi', type: 'on', wordReading: 'ちか', wordRomaji: 'chika', parts: [
      { text: '地', reading: 'ち', romaji: 'chi', meaning: 'đất', role: 'target' }, { text: '下', reading: 'か', romaji: 'ka', meaning: 'bên dưới', role: 'support' }] },
    { word: '地面', mean: 'mặt đất', target: '地', answer: 'じ', romaji: 'ji', type: 'on', wordReading: 'じめん', wordRomaji: 'jimen', parts: [
      { text: '地', reading: 'じ', romaji: 'ji', meaning: 'đất', role: 'target' }, { text: '面', reading: 'めん', romaji: 'men', meaning: 'bề mặt', role: 'support' }] },
    // 池
    { word: '電池', mean: 'pin điện', target: '池', answer: 'ち', romaji: 'chi', type: 'on', wordReading: 'でんち', wordRomaji: 'denchi', parts: [
      { text: '電', reading: 'でん', romaji: 'den', meaning: 'điện', role: 'support' }, { text: '池', reading: 'ち', romaji: 'chi', meaning: 'bể chứa', role: 'target' }] },
    { word: '池', mean: 'ao / hồ nhỏ', target: '池', answer: 'いけ', romaji: 'ike', type: 'kun', wordReading: 'いけ', wordRomaji: 'ike', parts: [
      { text: '池', reading: 'いけ', romaji: 'ike', meaning: 'ao', role: 'target' }] },
    // 茶
    { word: 'お茶', mean: 'trà', target: '茶', answer: 'ちゃ', romaji: 'cha', type: 'on', wordReading: 'おちゃ', wordRomaji: 'ocha', parts: [
      { text: 'お', reading: 'お', romaji: 'o', meaning: 'tiền tố lịch sự', role: 'kana' }, { text: '茶', reading: 'ちゃ', romaji: 'cha', meaning: 'trà', role: 'target' }] },
    { word: '茶道', mean: 'trà đạo', target: '茶', answer: 'さ', romaji: 'sa', type: 'on', wordReading: 'さどう', wordRomaji: 'sadou', parts: [
      { text: '茶', reading: 'さ', romaji: 'sa', meaning: 'trà', role: 'target' }, { text: '道', reading: 'どう', romaji: 'dou', meaning: 'đạo / con đường', role: 'support' }] },
    // 着
    { word: '到着', mean: 'đến nơi', target: '着', answer: 'ちゃく', romaji: 'chaku', type: 'on', wordReading: 'とうちゃく', wordRomaji: 'touchaku', parts: [
      { text: '到', reading: 'とう', romaji: 'tou', meaning: 'đến', role: 'support' }, { text: '着', reading: 'ちゃく', romaji: 'chaku', meaning: 'tới nơi', role: 'target' }] },
    { word: '着る', mean: 'mặc', target: '着', answer: 'き', romaji: 'ki', type: 'kun', wordReading: 'きる', wordRomaji: 'kiru', parts: [
      { text: '着', reading: 'き', romaji: 'ki', meaning: 'mặc', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 昼
    { word: '昼食', mean: 'bữa trưa', target: '昼', answer: 'ちゅう', romaji: 'chuu', type: 'on', wordReading: 'ちゅうしょく', wordRomaji: 'chuushoku', parts: [
      { text: '昼', reading: 'ちゅう', romaji: 'chuu', meaning: 'buổi trưa', role: 'target' }, { text: '食', reading: 'しょく', romaji: 'shoku', meaning: 'bữa ăn', role: 'support' }] },
    { word: '昼', mean: 'ban trưa', target: '昼', answer: 'ひる', romaji: 'hiru', type: 'kun', wordReading: 'ひる', wordRomaji: 'hiru', parts: [
      { text: '昼', reading: 'ひる', romaji: 'hiru', meaning: 'ban trưa', role: 'target' }] },
    // 注
    { word: '注意', mean: 'chú ý', target: '注', answer: 'ちゅう', romaji: 'chuu', type: 'on', wordReading: 'ちゅうい', wordRomaji: 'chuui', parts: [
      { text: '注', reading: 'ちゅう', romaji: 'chuu', meaning: 'chú ý', role: 'target' }, { text: '意', reading: 'い', romaji: 'i', meaning: 'ý', role: 'support' }] },
    { word: '注ぐ', mean: 'rót / đổ vào', target: '注', answer: 'そそ', romaji: 'soso', type: 'kun', wordReading: 'そそぐ', wordRomaji: 'sosogu', parts: [
      { text: '注', reading: 'そそ', romaji: 'soso', meaning: 'rót', role: 'target' }, { text: 'ぐ', reading: 'ぐ', romaji: 'gu', meaning: '', role: 'kana' }] },
    // 町
    { word: '町長', mean: 'thị trưởng', target: '町', answer: 'ちょう', romaji: 'chou', type: 'on', wordReading: 'ちょうちょう', wordRomaji: 'chouchou', parts: [
      { text: '町', reading: 'ちょう', romaji: 'chou', meaning: 'thị trấn', role: 'target' }, { text: '長', reading: 'ちょう', romaji: 'chou', meaning: 'người đứng đầu', role: 'support' }] },
    { word: '町', mean: 'phố / thị trấn', target: '町', answer: 'まち', romaji: 'machi', type: 'kun', wordReading: 'まち', wordRomaji: 'machi', parts: [
      { text: '町', reading: 'まち', romaji: 'machi', meaning: 'phố', role: 'target' }] },
    // 鳥
    { word: '野鳥', mean: 'chim hoang dã', target: '鳥', answer: 'ちょう', romaji: 'chou', type: 'on', wordReading: 'やちょう', wordRomaji: 'yachou', parts: [
      { text: '野', reading: 'や', romaji: 'ya', meaning: 'hoang dã', role: 'support' }, { text: '鳥', reading: 'ちょう', romaji: 'chou', meaning: 'chim', role: 'target' }] },
    { word: '鳥', mean: 'con chim', target: '鳥', answer: 'とり', romaji: 'tori', type: 'kun', wordReading: 'とり', wordRomaji: 'tori', parts: [
      { text: '鳥', reading: 'とり', romaji: 'tori', meaning: 'chim', role: 'target' }] },
    // 朝
    { word: '朝食', mean: 'bữa sáng', target: '朝', answer: 'ちょう', romaji: 'chou', type: 'on', wordReading: 'ちょうしょく', wordRomaji: 'choushoku', parts: [
      { text: '朝', reading: 'ちょう', romaji: 'chou', meaning: 'buổi sáng', role: 'target' }, { text: '食', reading: 'しょく', romaji: 'shoku', meaning: 'bữa ăn', role: 'support' }] },
    { word: '朝', mean: 'buổi sáng', target: '朝', answer: 'あさ', romaji: 'asa', type: 'kun', wordReading: 'あさ', wordRomaji: 'asa', parts: [
      { text: '朝', reading: 'あさ', romaji: 'asa', meaning: 'buổi sáng', role: 'target' }] },
    // 通
    { word: '通学', mean: 'đi học', target: '通', answer: 'つう', romaji: 'tsuu', type: 'on', wordReading: 'つうがく', wordRomaji: 'tsuugaku', parts: [
      { text: '通', reading: 'つう', romaji: 'tsuu', meaning: 'đi lại', role: 'target' }, { text: '学', reading: 'がく', romaji: 'gaku', meaning: 'học', role: 'support' }] },
    { word: '通る', mean: 'đi qua', target: '通', answer: 'とお', romaji: 'too', type: 'kun', wordReading: 'とおる', wordRomaji: 'tooru', parts: [
      { text: '通', reading: 'とお', romaji: 'too', meaning: 'đi qua', role: 'target' }, { text: 'る', reading: 'る', romaji: 'ru', meaning: '', role: 'kana' }] },
    // 弟
    { word: '兄弟', mean: 'anh em', target: '弟', answer: 'だい', romaji: 'dai', type: 'on', wordReading: 'きょうだい', wordRomaji: 'kyoudai', parts: [
      { text: '兄', reading: 'きょう', romaji: 'kyou', meaning: 'anh', role: 'support' }, { text: '弟', reading: 'だい', romaji: 'dai', meaning: 'em', role: 'target' }] },
    { word: '弟', mean: 'em trai', target: '弟', answer: 'おとうと', romaji: 'otouto', type: 'kun', wordReading: 'おとうと', wordRomaji: 'otouto', parts: [
      { text: '弟', reading: 'おとうと', romaji: 'otouto', meaning: 'em trai', role: 'target' }] },
    // 低
    { word: '低温', mean: 'nhiệt độ thấp', target: '低', answer: 'てい', romaji: 'tei', type: 'on', wordReading: 'ていおん', wordRomaji: 'teion', parts: [
      { text: '低', reading: 'てい', romaji: 'tei', meaning: 'thấp', role: 'target' }, { text: '温', reading: 'おん', romaji: 'on', meaning: 'nhiệt độ', role: 'support' }] },
    { word: '低い', mean: 'thấp', target: '低', answer: 'ひく', romaji: 'hiku', type: 'kun', wordReading: 'ひくい', wordRomaji: 'hikui', parts: [
      { text: '低', reading: 'ひく', romaji: 'hiku', meaning: 'thấp', role: 'target' }, { text: 'い', reading: 'い', romaji: 'i', meaning: '', role: 'kana' }] },
    // 転
    { word: '運転', mean: 'lái xe / vận hành', target: '転', answer: 'てん', romaji: 'ten', type: 'on', wordReading: 'うんてん', wordRomaji: 'unten', parts: [
      { text: '運', reading: 'うん', romaji: 'un', meaning: 'vận hành', role: 'support' }, { text: '転', reading: 'てん', romaji: 'ten', meaning: 'chuyển động', role: 'target' }] },
    { word: '転ぶ', mean: 'ngã', target: '転', answer: 'ころ', romaji: 'koro', type: 'kun', wordReading: 'ころぶ', wordRomaji: 'korobu', parts: [
      { text: '転', reading: 'ころ', romaji: 'koro', meaning: 'ngã', role: 'target' }, { text: 'ぶ', reading: 'ぶ', romaji: 'bu', meaning: '', role: 'kana' }] },
    // 田
    { word: '水田', mean: 'ruộng lúa nước', target: '田', answer: 'でん', romaji: 'den', type: 'on', wordReading: 'すいでん', wordRomaji: 'suiden', parts: [
      { text: '水', reading: 'すい', romaji: 'sui', meaning: 'nước', role: 'support' }, { text: '田', reading: 'でん', romaji: 'den', meaning: 'ruộng', role: 'target' }] },
    { word: '田んぼ', mean: 'ruộng lúa', target: '田', answer: 'た', romaji: 'ta', type: 'kun', wordReading: 'たんぼ', wordRomaji: 'tanbo', parts: [
      { text: '田', reading: 'た', romaji: 'ta', meaning: 'ruộng', role: 'target' }, { text: 'んぼ', reading: 'んぼ', romaji: 'nbo', meaning: '', role: 'kana' }] },
    // 都
    { word: '都会', mean: 'thành thị', target: '都', answer: 'と', romaji: 'to', type: 'on', wordReading: 'とかい', wordRomaji: 'tokai', parts: [
      { text: '都', reading: 'と', romaji: 'to', meaning: 'đô thị', role: 'target' }, { text: '会', reading: 'かい', romaji: 'kai', meaning: 'tụ họp', role: 'support' }] },
    { word: '都', mean: 'kinh đô', target: '都', answer: 'みやこ', romaji: 'miyako', type: 'kun', wordReading: 'みやこ', wordRomaji: 'miyako', parts: [
      { text: '都', reading: 'みやこ', romaji: 'miyako', meaning: 'kinh đô', role: 'target' }] },
    // 度
    { word: '温度', mean: 'nhiệt độ', target: '度', answer: 'ど', romaji: 'do', type: 'on', wordReading: 'おんど', wordRomaji: 'ondo', parts: [
      { text: '温', reading: 'おん', romaji: 'on', meaning: 'ấm / nhiệt', role: 'support' }, { text: '度', reading: 'ど', romaji: 'do', meaning: 'mức độ', role: 'target' }] },
    { word: '度々', mean: 'nhiều lần / thường xuyên', target: '度', answer: 'たび', romaji: 'tabi', type: 'kun', wordReading: 'たびたび', wordRomaji: 'tabitabi', parts: [
      { text: '度', reading: 'たび', romaji: 'tabi', meaning: 'lần', role: 'target' }, { text: '々', reading: 'たび', romaji: 'tabi', meaning: 'lặp lại', role: 'support' }] },
    // 答
    { word: '回答', mean: 'câu trả lời', target: '答', answer: 'とう', romaji: 'tou', type: 'on', wordReading: 'かいとう', wordRomaji: 'kaitou', parts: [
      { text: '回', reading: 'かい', romaji: 'kai', meaning: 'phản hồi', role: 'support' }, { text: '答', reading: 'とう', romaji: 'tou', meaning: 'đáp án', role: 'target' }] },
    { word: '答える', mean: 'trả lời', target: '答', answer: 'こた', romaji: 'kota', type: 'kun', wordReading: 'こたえる', wordRomaji: 'kotaeru', parts: [
      { text: '答', reading: 'こた', romaji: 'kota', meaning: 'trả lời', role: 'target' }, { text: 'える', reading: 'える', romaji: 'eru', meaning: '', role: 'kana' }] },
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
    'とも', 'さ', 'ひだり', 'きゅう', 'やす', 'ふ', 'ちち', 'とう', 'あく', 'わる', 'あん', 'くら',
    'いん', 'うん', 'はこ', 'えい', 'うつ', 'えん', 'とお', 'おく', 'うた', 'なつ', 'いえ', 'が', 'かく', 'かい', 'うみ', 'まわ',
    'ひら', 'さかい', 'らく', 'たの', 'やかた', 'かん', 'さむ', 'がん', 'かお', 'かえ', 'きわ', 'いそ', 'ぎゅう', 'きょ', 'つよ', 'きょう', 'ごう', 'おし', 'おそ', 'けい', 'みやこ', 'わざ', 'ちか', 'ぎん',
    'はか', 'あに', 'かる', 'いぬ', 'ひろ', 'かんが', 'ひかり', 'くろ', 'つく', 'かみ',
    'おも', 'あね', 'わたし', 'じ', 'みずか', 'ごと', 'も', 'しつ', 'しゃ', 'もの', 'しゃっ', 'よわ',
    'しゅ', 'くび', 'ぬし', 'しゅう', 'あつ', 'なら', 'じゅう', 'はる', 'ところ', 'ば', 'じょう', 'いろ', 'しき', 'もり',
    'こころ', 'おや', 'しん', 'まこと', 'すす', 'ず', 'あお', 'ただ', 'こえ', 'せ', 'せき', 'あか', 'ゆう', 'せつ',
    'あら', 'そう', 'はや', 'はし', 'おく', 'ぞく', 'そん', 'むら', 'からだ', 'ふと', 'たい', 'だい', 'たん', 'みじか',
    'ち', 'いけ', 'ちゃ', 'さ', 'ちゃく', 'ひる', 'ちゅう', 'そそ', 'まち', 'ちょう', 'とり', 'あさ', 'つう', 'とお',
    'てい', 'おとうと', 'ひく', 'てん', 'ころ', 'た', 'みやこ', 'ど', 'たび', 'とう', 'こた'],
};
