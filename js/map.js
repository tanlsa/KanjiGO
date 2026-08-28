// ============================================================
//  MAP.JS — THẾ GIỚI MỞ RỘNG: HỌC VIỆN / WILDERNESS / ARENA / TECH CAMPUS.
//  Tile 0–9: atlas gốc / kiến trúc. Tile 10–25: terrain mở rộng.
//  Tile 26–29: PNG campus chuyên biệt, đồng bộ với các landmark FPT mới.
// ============================================================
(function () {
  const W = 64, H = 44;
  const T = {
    GRASS: 0, TREE: 1, WATER: 2, PATH: 3, FLOWER: 4, TALL: 5, BOAT: 6, DOOR: 7, WALL: 8, ROOF: 9,
    PLAZA: 10, COBBLE: 11, ARENA: 12, DARK_STONE: 13, GOLD: 14, BRICK: 15, SOIL: 16, GARDEN: 17,
    VIVID_GRASS: 18, DARK_GRASS: 19, MOSS: 20, SHORE: 21, RED_CARPET: 22, BLUE_CARPET: 23,
    GRAVEL: 24, WORN_PATH: 25,
    CAMPUS_LAWN: 26, CAMPUS_PLAZA: 27, TECH_PROMENADE: 28, CAMPUS_COURTYARD: 29,
  };
  const tiles = Array.from({ length: H }, () => Array(W).fill(T.GRASS));
  const put = (x, y, tile) => { if (x >= 0 && y >= 0 && x < W && y < H) tiles[y][x] = tile; };
  const rect = (x, y, w, h, tile) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, tile);
  };
  const lineH = (x1, x2, y, tile = T.PATH) => { for (let x = x1; x <= x2; x++) put(x, y, tile); };
  const lineV = (x, y1, y2, tile = T.PATH) => { for (let y = y1; y <= y2; y++) put(x, y, tile); };

  const areas = {
    campus: { id: 'campus', label: 'GIẢNG ĐƯỜNG', x: 1, y: 1, width: 13, height: 13 },
    ftown: { id: 'ftown', label: 'FTOWN TECH CAMPUS', x: 45, y: 1, width: 18, height: 14, approachGx: 53, approachGy: 12 },
    hub: { id: 'hub', label: 'QUẢNG TRƯỜNG', x: 15, y: 8, width: 13, height: 7 },
    wilderness: { id: 'wilderness', label: 'WILDERNESS', x: 30, y: 1, width: 13, height: 15, signGx: 31, signGy: 9 },
    arena: { id: 'arena', label: 'KANJI TRAINER ARENA', x: 10, y: 17, width: 21, height: 13, centerGx: 20, centerGy: 23 },
    debugGarden: { id: 'debugGarden', label: '404 GARDEN', x: 1, y: 16, width: 8, height: 9, approachGx: 5, approachGy: 23 },
    campusPark: { id: 'campusPark', label: 'FPT CAMPUS PARK', x: 9, y: 31, width: 23, height: 12, approachGx: 22, approachGy: 37 },
    hoaLac: { id: 'hoaLac', label: 'F-VILLE HÒA LẠC', x: 35, y: 31, width: 22, height: 12, approachGx: 46, approachGy: 41 },
  };
  const arena = areas.arena;
  const decorations = {
    tulipGardens: [
      { x: 2, y: 8, width: 3, height: 4, phase: 0 },
      { x: 9, y: 8, width: 3, height: 4, phase: 2.4 },
    ],
    techPark: {
      server: { gx: 3, gy: 20 }, portal: { gx: 6, gy: 18 }, duck: { gx: 7, gy: 21 },
      binaryFlowers: [[2,17,0],[3,17,1],[4,17,0],[2,18,1],[4,18,1],[6,21,0],[7,19,1]],
    },
    campusFeatures: {
      innovationHub: { x: 47, y: 17, width: 8, height: 4, doorGx: 51, doorGy: 20 },
      hoaLacLake: { x: 31, y: 32, width: 5, height: 5 },
      heritageGarden: { x: 2, y: 31, width: 6, height: 9 },
      encounterGroves: [
        { x: 45, y: 25, width: 3, height: 3 },
        { x: 52, y: 25, width: 3, height: 4 },
        { x: 32, y: 38, width: 4, height: 3 },
        { x: 2, y: 38, width: 3, height: 3 },
      ],
    },
  };
  const landmarks = [
    { id: 'ftown', label: 'FTOWN', subtitle: 'TECH CAMPUS', gx: 47, gy: 2, width: 14, height: 8, style: 'ftown', asset: 'landmark_ftown' },
    { id: 'innovation_hub', label: 'INNOVATION HUB', subtitle: 'GREEN TECH LAB', gx: 47, gy: 17, width: 8, height: 4, style: 'innovation', asset: 'landmark_innovation_hub', collision: { gx: 47, gy: 17, width: 8, height: 4, entrances: [[50, 20], [51, 20]] } },
    { id: 'heritage_pavilion', label: 'HERITAGE GARDEN', subtitle: 'PAVILION', gx: 2.5, gy: 31.5, width: 5, height: 2.5, style: 'heritage', asset: 'landmark_heritage_pavilion', collision: { gx: 3, gy: 32, width: 4, height: 2, entrances: [[5, 33]] } },
    { id: 'hoa_lac', label: 'F-VILLE', subtitle: 'HÒA LẠC', gx: 38, gy: 33, width: 16, height: 8, style: 'hoa_lac', asset: 'landmark_hoa_lac' },
  ];
  const props = [
    {
      id: 'fpt_software_monument', asset: 'prop_fpt_sign', gx: 18, gy: 0.9, width: 7, height: 2.8125,
      collisions: [{ x: 18, y: 3, width: 7, height: 1 }],
    },
    {
      id: 'cuder_statue', asset: 'prop_cuder', gx: 57, gy: 34, width: 2, height: 3,
      collisions: [{ x: 57, y: 36, width: 2, height: 1 }],
    },
    {
      id: 'fpt_campus_garden', asset: 'prop_campus_garden', gx: 23, gy: 32, width: 6, height: 4,
      // Footprint theo silhouette tròn của fountain thay vì chặn nguyên khối
      // 6x4. Bốn góc PNG trong suốt vì vậy vẫn đi qua được, không còn ghost block.
      collisions: [
        { x: 25, y: 32, width: 2, height: 1 },
        { x: 24, y: 33, width: 4, height: 1 },
        { x: 23, y: 34, width: 6, height: 1 },
        { x: 24, y: 35, width: 4, height: 1 },
      ],
    },
    ...[
      [15,2,true],[26,3,true],[11,32,true],[28,38,true],[12,40,true],
      [46,14,true],[55,15,true],[45,24,true],[52,29,false],[33,41,false],
      // Planter dùng lại asset authored để chia nhỏ các khoảng sân rộng.
      [46,11,false],[59,11,false],[14,34,true],[29,34,true],[8,33,true],[35,38,true],
    ].map(([gx, gy, solid], index) => ({
      id: `campus_shrub_${index + 1}`, asset: 'prop_campus_shrub', gx, gy, width: 3, height: 1.5,
      // Chặn đúng lõi bụi cây, vẫn cho phép đi sát hai mép trong suốt. Hai cụm
      // đặt sát promenade chỉ đóng vai trò foreground để không bóp hẹp đường.
      collisions: solid ? [{ x: gx + 1, y: gy + 1, width: 1, height: 1 }] : [],
    })),
  ];
  const propCollisions = props.flatMap((prop) => (prop.collisions || []).map((collision) => ({
    propId: prop.id, ...collision,
  })));

  // Nền màu riêng giúp người chơi nhận ra mình đang ở khu nào ngay lập tức.
  rect(areas.campus.x, areas.campus.y, areas.campus.width, areas.campus.height, T.VIVID_GRASS);
  rect(areas.hub.x, areas.hub.y, areas.hub.width, areas.hub.height, T.GRASS);
  rect(areas.wilderness.x, areas.wilderness.y, areas.wilderness.width, areas.wilderness.height, T.DARK_GRASS);
  rect(1, 16, 8, 14, T.SOIL);
  rect(32, 17, 11, 13, T.MOSS);
  rect(areas.ftown.x, areas.ftown.y, areas.ftown.width, areas.ftown.height, T.CAMPUS_LAWN);
  rect(areas.hoaLac.x, areas.hoaLac.y, areas.hoaLac.width, areas.hoaLac.height, T.CAMPUS_LAWN);

  // Rừng bao quanh bản đồ và các dải cây đóng vai trò vách ngăn tự nhiên.
  lineH(0, W - 1, 0, T.TREE); lineH(0, W - 1, H - 1, T.TREE);
  lineV(0, 0, H - 1, T.TREE); lineV(W - 1, 0, H - 1, T.TREE);
  lineV(14, 1, 7, T.TREE); lineV(14, 10, 15, T.TREE);
  lineV(29, 1, 8, T.TREE); lineV(29, 13, 15, T.TREE);
  lineH(1, 18, 15, T.TREE); lineH(22, 42, 15, T.TREE);
  rect(2, 25, 6, 5, T.TREE); rect(34, 25, 8, 5, T.TREE);
  lineV(44, 1, 9, T.TREE); lineV(44, 14, 30, T.TREE);
  rect(58, 18, 5, 10, T.TREE); rect(58, 31, 5, 11, T.TREE);
  [[2,2],[12,2],[2,12],[12,12],[16,2],[18,3],[25,2],[27,5],[32,18],[41,18],[7,20],[36,20]].forEach(([x,y]) => put(x,y,T.TREE));

  // Ba trục chính gặp nhau tại Hub. Mỗi lối rộng hai ô ở điểm chuyển khu.
  lineH(6, 20, 8, T.WORN_PATH); lineH(6, 20, 9, T.WORN_PATH);
  lineH(20, 34, 11, T.WORN_PATH); lineH(20, 34, 12, T.WORN_PATH);
  lineV(20, 11, 17, T.CAMPUS_PLAZA); lineV(21, 11, 17, T.CAMPUS_PLAZA);
  rect(16, 9, 10, 5, T.PLAZA);
  lineH(2, 10, 23, T.WORN_PATH); lineH(30, 41, 23, T.WORN_PATH);

  // Hai campus công nghệ nằm ở phần bản đồ mở rộng, có quảng trường riêng và
  // promenade dài để cảm giác quy mô lớn hơn thay vì chen vào Hub cũ.
  rect(47, 2, 14, 8, T.ROOF); rect(46, 10, 16, 4, T.CAMPUS_PLAZA);
  // Hai đảo cỏ/planter phá khối sân trắng 16x4 nhưng giữ trục cửa rộng 10 ô.
  rect(46, 12, 3, 2, T.CAMPUS_LAWN); rect(59, 12, 3, 2, T.CAMPUS_LAWN);
  put(48, 13, T.CAMPUS_PLAZA); put(59, 13, T.CAMPUS_PLAZA);
  lineH(41, 45, 11, T.TECH_PROMENADE); lineH(41, 45, 12, T.TECH_PROMENADE);
  rect(38, 33, 16, 8, T.ROOF); rect(37, 41, 18, 2, T.CAMPUS_COURTYARD);
  // Trục campus phía đông dùng gravel nhất quán; sân gạch cam F-Ville không
  // còn bị một dải đất cắt ngang ngay dưới bậc thềm.
  lineH(41, 56, 23, T.GRAVEL); lineV(56, 23, 41, T.GRAVEL); lineH(46, 55, 41, T.CAMPUS_COURTYARD);
  rect(45, 41, 2, 2, T.CAMPUS_COURTYARD);

  // Quảng trường nhận diện ở phía bắc Hub dành cho monument FPT SOFTWARE.
  // Hai lối cobble giữ monument nhìn rõ nhưng vẫn kết nối thẳng xuống Hub.
  rect(18, 1, 8, 5, T.CAMPUS_LAWN); rect(18, 3, 8, 2, T.CAMPUS_PLAZA);
  lineV(21, 4, 8, T.CAMPUS_PLAZA); lineV(22, 4, 8, T.CAMPUS_PLAZA);
  [[17,1],[27,1],[17,4],[27,4],[18,6],[25,6]].forEach(([x,y]) => put(x,y,T.FLOWER));

  // Innovation Hub có PNG landmark riêng phủ kín footprint; sân trước giữ một
  // bề mặt tech liền mạch và trục gạch sáng dẫn thẳng vào cửa chính.
  rect(47, 17, 8, 2, T.ROOF); rect(47, 19, 8, 2, T.WALL);
  rect(47, 21, 8, 2, T.TECH_PROMENADE); rect(50, 20, 2, 4, T.CAMPUS_PLAZA);
  [[45,17],[56,17],[45,20],[56,20],[48,24],[54,24],[57,29]].forEach(([x,y]) => put(x,y,T.FLOWER));
  rect(45, 25, 3, 3, T.TALL); rect(52, 25, 3, 4, T.TALL);
  lineH(45, 55, 30, T.GRAVEL); lineV(49, 23, 30, T.GRAVEL);

  // Hồ phản chiếu và vườn tre thu nhỏ làm vùng chuyển tiếp vào F-Ville bớt trống.
  rect(31, 32, 5, 5, T.SHORE); rect(31, 33, 5, 3, T.WATER);
  // Ba hàng nước 3–5–3 tạo hồ oval; hàng shore bao quanh giữ mép hồ kín.
  put(31,33,T.SHORE); put(35,33,T.SHORE); put(31,35,T.SHORE); put(35,35,T.SHORE);
  lineV(36, 32, 41, T.GRAVEL); lineH(36, 38, 41, T.GRAVEL);
  rect(32, 38, 4, 3, T.TALL);
  [[32,31],[35,31],[32,37],[35,37],[33,41],[36,42],[55,34],[55,38]].forEach(([x,y]) => put(x,y,T.FLOWER));

  // Heritage Garden phía tây nam là một điểm nghỉ có pavilion mái ngói, vườn
  // cây và một lối xuyên rừng nối lại tuyến 404 Garden.
  lineV(5, 23, 38, T.WORN_PATH); rect(2, 31, 6, 7, T.CAMPUS_LAWN);
  rect(3, 32, 4, 1, T.ROOF); rect(3, 33, 4, 1, T.WALL); put(5, 33, T.DOOR);
  rect(2, 34, 6, 4, T.GARDEN);
  rect(2, 38, 3, 3, T.TALL); rect(4, 34, 2, 5, T.CAMPUS_PLAZA); lineV(6, 34, 38, T.CAMPUS_LAWN); lineH(4, 8, 39, T.WORN_PATH);
  [[2,31],[7,31],[2,35],[7,35],[7,38],[7,40]].forEach(([x,y]) => put(x,y,T.FLOWER));

  // Campus Park mở rộng vùng nam Arena thành một quảng trường xanh hoàn chỉnh.
  // Trục giữa nối cổng Arena với Hòa Lạc; các cụm cỏ hai bên là encounter mới.
  rect(9, 31, 23, 12, T.CAMPUS_LAWN);
  lineV(20, 30, 41, T.COBBLE); lineV(21, 30, 41, T.COBBLE);
  lineH(8, 37, 41, T.WORN_PATH); lineH(20, 23, 36, T.GRAVEL);
  rect(10, 32, 4, 3, T.TALL); rect(28, 37, 3, 4, T.TALL); rect(10, 38, 3, 3, T.TALL);
  rect(23, 32, 6, 4, T.GARDEN);
  [[10,31],[14,31],[29,31],[31,34],[15,36],[30,36],[14,40],[31,40]].forEach(([x,y]) => put(x,y,T.FLOWER));

  // Góc tây nam trở thành công viên khám phá thay vì một bãi đất trống.
  rect(1, 16, 8, 7, T.VIVID_GRASS); lineH(2, 7, 22, T.WORN_PATH);
  lineV(5, 20, 23, T.WORN_PATH); rect(2, 17, 3, 2, T.GARDEN);
  put(decorations.techPark.server.gx, decorations.techPark.server.gy, T.ROOF);
  put(decorations.techPark.portal.gx, decorations.techPark.portal.gy, T.ROOF);

  // CAMPUS: Giảng đường, sân lát đá và hai vườn đối xứng, không có encounter.
  rect(1, 1, 13, 8, T.PLAZA);
  rect(2, 8, 3, 4, T.GARDEN); rect(9, 8, 3, 4, T.GARDEN);
  [2, 3, 5, 7, 9, 11, 12].forEach((x) => put(x, 1, T.TREE));
  lineV(7, 8, 13, T.CAMPUS_PLAZA);
  lineH(7, 15, 8, T.CAMPUS_PLAZA); lineH(7, 15, 9, T.CAMPUS_PLAZA);
  rect(2, 2, 11, 4, T.ROOF);
  rect(2, 6, 11, 3, T.WALL);
  put(7, 8, T.DOOR);

  // Dọn seam giữa Giảng đường và Hub: phần đường đất còn dư biến thành bụi
  // cỏ encounter, còn ô (6,9) sát facade trở về đúng lawn của campus.
  rect(16, 8, 5, 1, T.TALL); put(6, 9, T.VIVID_GRASS);

  // WILDERNESS: hồ ở phía bắc, hai đồng cỏ encounter ở phía nam.
  rect(34, 2, 8, 7, T.WATER);
  put(34,2,T.MOSS); put(41,2,T.MOSS); put(34,3,T.SHORE); put(41,3,T.SHORE);
  put(34,8,T.SHORE); put(41,8,T.SHORE);
  put(33,5,T.BOAT); put(34,5,T.WATER);
  lineH(31, 38, 10, T.GRAVEL); lineV(33, 5, 13, T.GRAVEL);
  rect(31, 11, 4, 4, T.TALL); rect(37, 10, 5, 5, T.TALL);
  lineH(20, 34, 11, T.CAMPUS_PLAZA); lineH(20, 34, 12, T.CAMPUS_PLAZA);
  lineV(20, 13, 17, T.CAMPUS_PLAZA); lineV(21, 13, 17, T.CAMPUS_PLAZA);
  [[31,2],[32,3],[40,10],[36,13],[41,14],[30,7]].forEach(([x,y]) => put(x,y,T.FLOWER));

  // Phá các ma trận encounter/rừng quá vuông bằng các hốc cỏ và khoảng thở có
  // chủ đích. Biên ngoài vẫn kín, còn mọi grove vẫn giữ đủ tall grass để spawn.
  [[34,14],[37,10],[41,13]].forEach(([x,y]) => put(x,y,T.DARK_GRASS));
  [[45,25],[47,27],[52,25],[54,28],[10,32],[13,34],[28,37],[30,40],[32,38],[35,40]]
    .forEach(([x,y]) => put(x,y,T.CAMPUS_LAWN));
  [[58,19],[58,23],[60,27],[58,33],[58,37],[60,40],[62,35]].forEach(([x,y]) => put(x,y,T.GRASS));

  // Tượng Cuder có pocket plaza riêng phía đông trục chính, đủ rộng để đọc
  // silhouette và không đè lên footprint F-Ville hoặc bóp hẹp con đường.
  rect(57, 34, 3, 4, T.CAMPUS_PLAZA);
  put(59,34,T.GRASS); put(59,37,T.GRASS);
  put(56,35,T.CAMPUS_PLAZA); put(56,36,T.CAMPUS_PLAZA);
  lineH(56, 58, 37, T.CAMPUS_PLAZA); put(56,37,T.GRAVEL);

  // TRAINER ARENA: vành đai đá, bốn cổng, 15 bục Trainer và Boss giữa sân.
  rect(arena.x - 1, arena.y - 1, arena.width + 2, arena.height + 2, T.COBBLE);
  rect(arena.x + 1, arena.y + 1, arena.width - 2, arena.height - 2, T.DARK_STONE);
  // Một trục giữa duy nhất: arena có kích thước lẻ và Boss nằm đúng tâm ô.
  lineV(arena.centerGx, arena.y + 1, arena.y + arena.height - 2, T.BLUE_CARPET);
  lineH(arena.x + 1, arena.x + arena.width - 2, arena.centerGy, T.RED_CARPET);
  rect(arena.centerGx - 1, arena.centerGy - 1, 3, 3, T.GOLD);
  for (let x = arena.x; x < arena.x + arena.width; x++) { put(x, arena.y, T.WALL); put(x, arena.y + arena.height - 1, T.WALL); }
  for (let y = arena.y; y < arena.y + arena.height; y++) { put(arena.x, y, T.WALL); put(arena.x + arena.width - 1, y, T.WALL); }
  [[arena.centerGx, arena.y], [arena.centerGx, arena.y + arena.height - 1],
    [arena.x, arena.centerGy], [arena.x + arena.width - 1, arena.centerGy]].forEach(([x, y]) => put(x, y, T.COBBLE));

  const trainerPositions = [
    [12,19], [15,19], [18,19], [23,19], [26,19],
    [12,21], [12,24], [12,27], [28,21], [28,24], [28,27],
    [14,28], [17,28], [23,28], [26,28],
  ];
  trainerPositions.forEach(([x, y]) => put(x, y, T.ARENA));

  // Landmark nhỏ ngoài công trình, tránh đặt lên các trục giao thông.
  [[3,13],[11,13],[16,6],[27,10],[8,14],[32,20],[40,25]].forEach(([x,y]) => put(x,y,T.FLOWER));
  const trainerNpcs = (((window.CONFIG || {}).TRAINER_ARENA || {}).trainers || []).map((trainer, index) => {
    const [gx, gy] = trainerPositions[index];
    // Trainer nhìn về vòng đấu thay vì 15 bản sao cùng quay xuống màn hình.
    const facing = Math.abs(gx - arena.centerGx) > Math.abs(gy - arena.centerGy)
      ? (gx < arena.centerGx ? 'right' : 'left') : (gy < arena.centerGy ? 'down' : 'up');
    return { gx, gy, facing, type: 'trainer', trainerId: trainer.id, icon: trainer.icon };
  });

  window.MAP_DATA = {
    TILES: tiles,
    AREAS: areas,
    ARENA: arena,
    LANDMARKS: landmarks,
    PROPS: props,
    PROP_COLLISIONS: propCollisions,
    DECORATIONS: decorations,
    SIGNS: [
      { gx: 31, gy: 9, label: 'WILDERNESS', color: '#4b9b65' },
      { gx: 46, gy: 12, label: 'FTOWN', color: '#56636b' },
      { gx: 54, gy: 41, label: 'F-VILLE · HÒA LẠC', color: '#397a5c' },
      { gx: 1, gy: 21, label: '404 GARDEN', color: '#397a68' },
      { gx: 45, gy: 22, label: 'INNOVATION HUB', color: '#397a68' },
      { gx: 1, gy: 36, label: 'HERITAGE GARDEN', color: '#397a68' },
      { gx: 36, gy: 37, label: 'HỒ CAMPUS', color: '#3b8ba4' },
      { gx: 15, gy: 35, label: 'CAMPUS PARK', color: '#397a68' },
    ],
    // NPC onboarding được engine đặt ở đúng chặng đang học. Các điểm đứng đều
    // nằm cạnh trục chính để người mới không bị kẹt trong collision map.
    ONBOARDING_GUIDE: {
      id: 'aoi', name: 'Aoi',
      stops: [
        {
          id: 'academy', gx: 8, gy: 9, facing: 'left', label: 'Giảng đường Kanji', action: 'academy',
          objective: 'Theo cô Aoi tới Giảng đường để học chữ đầu tiên',
          lines: [
            'Mình là Aoi, hướng dẫn viên của bạn. Đây là Giảng đường Kanji — nơi mở khóa và nạp kiến thức cho chữ mới.',
            'Mình sẽ mở Learning Card của chữ bạn vừa chọn. Hãy học, vượt mini-check và thu phục chữ đó; sau đó mình mới dẫn bạn đi tiếp nhé!',
          ],
        },
        {
          id: 'wilderness', gx: 31, gy: 10, facing: 'right', label: 'Wilderness', action: 'continue',
          objective: 'Theo cô Aoi sang Wilderness để xem khu luyện tập',
          lines: [
            'Đây là Wilderness. Bụi cỏ dùng để gặp lại Kanji đã mở khóa; hồ nước dành cho câu cá và những chữ liên quan tới nước.',
            'Chiến đấu ở đây giúp bạn ôn từ vựng, tăng Recall và nâng level cho mascot — không thay thế việc học chữ mới ở Giảng đường.',
          ],
        },
        {
          id: 'arena', gx: 20, gy: 16, facing: 'down', label: 'Trainer Arena', action: 'complete',
          objective: 'Theo cô Aoi tới cổng Trainer Arena',
          lines: [
            'Phía dưới là Trainer Arena. Mỗi Trainer kiểm tra một chủ đề; hãy thu phục đủ Kanji trong đội hình của họ để mở trận đấu.',
            'Khi hoàn thành toàn bộ N5 và vượt bài thi Boss, bạn sẽ nhận huy hiệu N5 để mở lộ trình N4. Tour nhập môn hoàn tất rồi!',
          ],
        },
      ],
    },
    NPCS: [
      {
        gx: 17, gy: 11,
        lines: [
          'Chào mừng đến Quảng trường KanjiGO! 👋',
          '← Giảng đường: học và thu phục Kanji mới.',
          '→ Wilderness: bụi cỏ, hồ nước và hoạt động khám phá.',
          '↓ Trainer Arena: đấu Trainer chủ đề và chinh phục Boss N5.',
          'Các đường chính đều rộng và nối trực tiếp qua quảng trường này.',
        ],
      },
      {
        gx: 53, gy: 12,
        lines: [
          'Chào mừng tới FTown Tech Campus — tòa nhà facade trắng và các dải kính tối phía đông Wilderness.',
          'Ban đêm, hãy thử nhìn các ô cửa sổ: một vài phòng vẫn đang “deploy”.',
        ],
      },
      {
        gx: 46, gy: 41,
        lines: [
          'Đây là F-Ville Hòa Lạc: mái xanh, sân trong và kiến trúc hòa vào cảnh quan.',
          'Các vòng tròn trên mái là một lời chào tới khu campus xanh ngoài đời thực.',
        ],
      },
      {
        gx: 50, gy: 22,
        lines: [
          'Innovation Hub dùng chung ngôn ngữ kiến trúc của campus: mái sáng, sân mở và ba dải màu nhận diện.',
          'Những bụi cỏ quanh đại lộ là khu encounter mới — vừa tham quan campus vừa luyện Kanji được nhé!',
        ],
      },
      {
        gx: 5, gy: 37,
        lines: [
          'Heritage Garden là góc nghỉ giữa khu công nghệ: pavilion nhỏ, lối lát đá và vườn cây đan xen.',
          'Đi xuyên qua hàng cây phía bắc sẽ quay lại 404 Garden.',
        ],
      },
      {
        gx: 57, gy: 38,
        lines: [
          'Đây là Cuder — biểu tượng của lập trình viên FPT Software: đầu to, kính tròn, bụng ỏng và chiếc cuốc khai phá.',
          'Tượng từng được rước về F-Ville và trở thành một biểu tượng may mắn của cộng đồng FSOFT.',
        ],
      },
      {
        gx: 22, gy: 36,
        lines: [
          'Campus Park nối Trainer Arena với khu F-Ville bằng đại lộ xanh và vườn công nghệ ba màu.',
          'Hai bên quảng trường có thêm bụi cỏ encounter; thử khám phá nếu bạn muốn ôn Kanji nhanh nhé!',
        ],
      },
      {
        gx: 5, gy: 21,
        lines: [
          'Bạn đã tìm thấy 404 Garden — khu vườn không có trong tài liệu hướng dẫn! 🥚',
          'Nếu code không chạy, hãy trình bày vấn đề cho chú vịt cao su ở góc phải. Nó chưa từng ngắt lời ai.',
          'Cổng nhị phân đang phát 0–1–0–1… hay đó là mã Konami nhỉ?',
        ],
      },
      ...trainerNpcs,
      { gx: arena.centerGx, gy: arena.centerGy, type: 'gym', tier: 'N5', icon: '👑', lines: ['👑 JLPT Gym', 'Thi hoặc ôn lại N5; sau khi PASS N5 sẽ mở thêm bài test N4.'] },
    ],
  };
})();
