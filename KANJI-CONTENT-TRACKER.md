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
2. Gym N5 mở khi đã thu phục **50 Kanji N5** và có **20 Kanji đạt Lv.5+**.
3. Vượt Gym N5 với ít nhất **70%** câu đúng sẽ nhận huy hiệu N5; đúng 100% nhận hạng S.
4. N4 chỉ xuất hiện trong Giảng đường và encounter sau khi có huy hiệu N5. Hiện có `PROGRESSION.testUnlockedTiers: ['N4']` để QA tạm thời.
5. `魚` là content bonus, không tính vào điều kiện hoàn thành N5/N4.

## Current snapshot

| Tier | Canonical | Ready | Partial | Missing | Runtime gate |
|---|---:|---:|---:|---:|---|
| N5 | 79 | 79 | 0 | 0 | Open; Gym after 50 captured + 20 at Lv.5 |
| N4 | 140 | 140 | 0 | 0 | Requires N5 badge; temporary QA override active |
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

### Ready (140/140)

- [x] `悪` — aku
- [x] `暗` — an
- [x] `医` — i_med
- [x] `意` — i_intent
- [x] `以` — i_by
- [x] `引` — hiku
- [x] `院` — institute
- [x] `員` — member
- [x] `運` — un
- [x] `英` — ei
- [x] `映` — utsu
- [x] `遠` — tooi
- [x] `屋` — ya
- [x] `音` — yin
- [x] `歌` — uta
- [x] `夏` — natsu
- [x] `家` — ie
- [x] `画` — ga_art
- [x] `海` — umi
- [x] `回` — kai_turn
- [x] `開` — hiraku
- [x] `界` — kai_world
- [x] `楽` — tanoshi
- [x] `館` — kan_building
- [x] `漢` — kan_han
- [x] `寒` — samui
- [x] `顔` — kao
- [x] `帰` — kaeru
- [x] `起` — okiru
- [x] `究` — kyuu_research
- [x] `急` — isogu
- [x] `牛` — ushi
- [x] `去` — saru
- [x] `強` — tsuyoi
- [x] `教` — oshieru
- [x] `京` — kyou_capital
- [x] `業` — gyou_business
- [x] `近` — chikai
- [x] `銀` — gin
- [x] `区` — ku_district
- [x] `計` — hakaru
- [x] `兄` — ani
- [x] `軽` — karui
- [x] `犬` — inu
- [x] `研` — ken_research
- [x] `県` — ken_prefecture
- [x] `建` — tateru
- [x] `験` — ken_test
- [x] `元` — moto
- [x] `工` — kou_craft
- [x] `広` — hiroi
- [x] `考` — kangaeru
- [x] `光` — hikari
- [x] `好` — suki
- [x] `合` — au
- [x] `黒` — kuro
- [x] `菜` — na_vegetable
- [x] `作` — tsukuru
- [x] `産` — umu
- [x] `紙` — kami_paper
- [x] `思` — omou
- [x] `姉` — ane
- [x] `止` — tomaru
- [x] `市` — shi_city
- [x] `仕` — shi_work
- [x] `死` — shi_death
- [x] `使` — tsukau
- [x] `始` — hajimeru
- [x] `試` — shi_try
- [x] `私` — watashi
- [x] `字` — ji_letter
- [x] `自` — mizukara
- [x] `事` — koto
- [x] `持` — motsu
- [x] `室` — shitsu_room
- [x] `質` — shitsu_quality
- [x] `写` — utsusu
- [x] `者` — mono_person
- [x] `借` — kariru
- [x] `弱` — yowai
- [x] `首` — kubi
- [x] `主` — shu_main
- [x] `秋` — aki
- [x] `集` — atsumeru
- [x] `習` — narau
- [x] `終` — owaru
- [x] `住` — sumu
- [x] `重` — omoi_heavy
- [x] `春` — haru
- [x] `所` — tokoro
- [x] `暑` — atsui
- [x] `場` — ba
- [x] `乗` — noru
- [x] `色` — iro
- [x] `森` — mori
- [x] `心` — kokoro
- [x] `親` — oya
- [x] `真` — shin_truth
- [x] `進` — susumu
- [x] `図` — zu
- [x] `青` — ao
- [x] `正` — tadashii
- [x] `声` — koe
- [x] `世` — yo
- [x] `赤` — aka
- [x] `夕` — yuu
- [x] `切` — kiru
- [x] `説` — toku
- [x] `洗` — arau
- [x] `早` — hayai
- [x] `走` — hashiru
- [x] `送` — okuru
- [x] `族` — zoku
- [x] `村` — mura
- [x] `体` — karada
- [x] `太` — futoi
- [x] `待` — matsu
- [x] `貸` — kasu
- [x] `台` — dai_platform
- [x] `代` — dai_generation
- [x] `題` — dai_topic
- [x] `短` — mijikai
- [x] `知` — shiru
- [x] `地` — chi_ground
- [x] `池` — ike
- [x] `茶` — cha
- [x] `着` — kiru_wear
- [x] `昼` — hiru
- [x] `注` — sosogu
- [x] `町` — machi
- [x] `鳥` — tori
- [x] `朝` — asa
- [x] `通` — tooru
- [x] `弟` — otouto
- [x] `低` — hikui
- [x] `転` — korobu
- [x] `田` — ta_ricefield
- [x] `都` — miyako
- [x] `度` — do_degree
- [x] `答` — kotaeru

### Missing (0/140)

Không còn chữ N4 thiếu content.

## Bonus

- [x] `魚` — fish; không nằm trong danh sách JLPT hiện tại.

## Batch workflow

Mỗi batch nên gồm 5–10 chữ và hoàn tất trọn bộ theo thứ tự:

1. thêm metadata + `jlpt` vào `js/kanji.js`;
2. thêm ít nhất 2 câu hỏi/từ vựng cho mỗi chữ;
3. thêm monster config và sprite đúng folder;
4. test Giảng đường, capture, Dex và battle;
5. cập nhật số liệu/checklist trong file này.

Việc tiếp theo: QA toàn bộ flow N4 sau huy hiệu N5 và tắt `PROGRESSION.testUnlockedTiers` khi kết thúc kiểm thử.
