# Kanji Content Tracker

Nguồn chuẩn: [KANJI-LIST.md](KANJI-LIST.md). Tracker này theo dõi **content readiness**, không theo dõi save của từng người chơi.

## Definition of done

Một Kanji chỉ được đánh dấu `READY` khi có đủ:

- metadata trong `KANJI_DB.KANJI` (`char`, `meaning`, `on`, `kun`, `monId`, `jlpt`);
- tối thiểu 2 câu hỏi/từ vựng có furigana và `parts` để làm nổi bật chữ đang học;
- monster trong `CONFIG.MONSTERS`;
- sprite nền trong suốt ở `assets/monsters/<monId>/sprite.png`;
- kiểm tra được flow Giảng đường → thu phục → KanjiDex → battle.

## Progression gate

1. N5 mở mặc định và đi đúng thứ tự trong catalog.
2. Gym N5 chỉ mở khi đã thu phục đủ **79/79 Kanji N5**.
3. Vượt Gym N5 với ít nhất **80%** câu đúng sẽ nhận huy hiệu N5.
4. N4 chỉ xuất hiện trong Giảng đường và encounter sau khi có huy hiệu N5.
5. `魚` là content bonus, không tính vào điều kiện hoàn thành N5/N4.

## Current snapshot

| Tier | Canonical | Ready | Partial | Missing | Runtime gate |
|---|---:|---:|---:|---:|---|
| N5 | 79 | 79 | 0 | 0 | Open; Gym after 79 captured |
| N4 | 140 | 5 | 0 | 135 | Requires N5 badge |
| Bonus | 1 | 1 | 0 | 0 | Not tier-gated |

Catalog hiện khớp đủ danh sách nguồn: 79 chữ N5 và 140 chữ N4, không có chữ trùng.

## N5

### Ready (79/79)

- [x] `日` — ri
- [x] `一` — bar
- [x] `国` — kuni
- [x] `人` — hito
- [x] `年` — nen
- [x] `大` — dai
- [x] `十` — juu
- [x] `二` — ni
- [x] `本` — hon
- [x] `中` — chuu
- [x] `長` — chou
- [x] `出` — shutsu
- [x] `三` — san
- [x] `時` — ji
- [x] `行` — gyou
- [x] `見` — ken
- [x] `今` — ima
- [x] `月` — getsu
- [x] `分` — bun
- [x] `後` — ato
- [x] `前` — mae
- [x] `生` — sei
- [x] `五` — go
- [x] `間` — kan
- [x] `上` — ue
- [x] `東` — higashi
- [x] `四` — yon
- [x] `金` — kin
- [x] `九` — kyuu
- [x] `入` — nyuu
- [x] `学` — gaku
- [x] `高` — kou
- [x] `円` — en
- [x] `子` — ko
- [x] `外` — gai
- [x] `八` — hachi
- [x] `六` — roku
- [x] `下` — shita
- [x] `来` — rai
- [x] `気` — ki
- [x] `小` — shou
- [x] `七` — nana
- [x] `山` — yama
- [x] `話` — hanashi
- [x] `女` — onna
- [x] `北` — kita
- [x] `午` — gozen
- [x] `百` — hyaku
- [x] `書` — sho
- [x] `先` — saki
- [x] `名` — na
- [x] `川` — kawa
- [x] `千` — sen
- [x] `水` — mizu
- [x] `半` — han
- [x] `男` — otoko
- [x] `西` — nishi
- [x] `電` — den
- [x] `語` — go_lang
- [x] `土` — tsuchi
- [x] `木` — moku
- [x] `食` — shoku
- [x] `車` — kuruma
- [x] `南` — minami
- [x] `何` — nani
- [x] `万` — man
- [x] `校` — kou_school
- [x] `毎` — mai
- [x] `白` — shiro
- [x] `天` — ten
- [x] `母` — haha
- [x] `火` — hi_fire
- [x] `右` — migi
- [x] `読` — yomu
- [x] `友` — tomo
- [x] `左` — hidari
- [x] `休` — yasumi
- [x] `父` — chichi
- [x] `雨` — ame

### Partial (0/79)

Không còn chữ partial trong batch hiện tại.

### Missing (0/79)

Không còn chữ N5 thiếu content.

## N4

### Ready (5/140)

- [x] `悪` — aku
- [x] `暗` — an
- [x] `医` — i_med
- [x] `意` — i_intent
- [x] `音` — yin

### Missing (135/140)

- [ ] `以 引 院 員 運 英 映 遠 屋 歌 夏 家 画 海`
- [ ] `回 開 界 楽 館 漢 寒 顔 帰 起 究 急 牛 去 強 教 京 業 近`
- [ ] `銀 区 計 兄 軽 犬 研 県 建 験 元 工 広 考 光 好 合 黒 菜`
- [ ] `作 産 紙 思 姉 止 市 仕 死 使 始 試 私 字 自 事 持 室 質`
- [ ] `写 者 借 弱 首 主 秋 集 習 終 住 重 春 所 暑 場 乗 色 森`
- [ ] `心 親 真 進 図 青 正 声 世 赤 夕 切 説 洗 早 走 送 族 村`
- [ ] `体 太 待 貸 台 代 題 短 知 地 池 茶 着 昼 注 町 鳥 朝 通`
- [ ] `弟 低 転 田 都 度 答`

## Bonus

- [x] `魚` — fish; không nằm trong danh sách JLPT hiện tại.

## Batch workflow

Mỗi batch nên gồm 5–10 chữ và hoàn tất trọn bộ theo thứ tự:

1. thêm metadata + `jlpt` vào `js/kanji.js`;
2. thêm ít nhất 2 câu hỏi/từ vựng cho mỗi chữ;
3. thêm monster config và sprite đúng folder;
4. test Giảng đường, capture, Dex và battle;
5. cập nhật số liệu/checklist trong file này.

Việc tiếp theo: tiếp tục N4 theo thứ tự với `以 引 院 員`.
