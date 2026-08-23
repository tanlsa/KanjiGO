// ============================================================
//  MAP.JS — BA KHU VỰC: CAMPUS / WILDERNESS / TRAINER ARENA.
//  Tile 0–9: atlas gốc / kiến trúc. Tile 10–25: terrain mở rộng.
// ============================================================
(function () {
  const W = 44, H = 32;
  const T = {
    GRASS: 0, TREE: 1, WATER: 2, PATH: 3, FLOWER: 4, TALL: 5, BOAT: 6, DOOR: 7, WALL: 8, ROOF: 9,
    PLAZA: 10, COBBLE: 11, ARENA: 12, DARK_STONE: 13, GOLD: 14, BRICK: 15, SOIL: 16, GARDEN: 17,
    VIVID_GRASS: 18, DARK_GRASS: 19, MOSS: 20, SHORE: 21, RED_CARPET: 22, BLUE_CARPET: 23,
    GRAVEL: 24, WORN_PATH: 25,
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
    hub: { id: 'hub', label: 'QUẢNG TRƯỜNG', x: 15, y: 8, width: 13, height: 7 },
    wilderness: { id: 'wilderness', label: 'WILDERNESS', x: 30, y: 1, width: 13, height: 15, signGx: 31, signGy: 9 },
    arena: { id: 'arena', label: 'KANJI TRAINER ARENA', x: 10, y: 17, width: 21, height: 13, centerGx: 20, centerGy: 23 },
  };
  const arena = areas.arena;

  // Nền màu riêng giúp người chơi nhận ra mình đang ở khu nào ngay lập tức.
  rect(areas.campus.x, areas.campus.y, areas.campus.width, areas.campus.height, T.VIVID_GRASS);
  rect(areas.hub.x, areas.hub.y, areas.hub.width, areas.hub.height, T.GRASS);
  rect(areas.wilderness.x, areas.wilderness.y, areas.wilderness.width, areas.wilderness.height, T.DARK_GRASS);
  rect(1, 16, 8, 14, T.SOIL);
  rect(32, 17, 11, 13, T.MOSS);

  // Rừng bao quanh bản đồ và các dải cây đóng vai trò vách ngăn tự nhiên.
  lineH(0, W - 1, 0, T.TREE); lineH(0, W - 1, H - 1, T.TREE);
  lineV(0, 0, H - 1, T.TREE); lineV(W - 1, 0, H - 1, T.TREE);
  lineV(14, 1, 7, T.TREE); lineV(14, 10, 15, T.TREE);
  lineV(29, 1, 8, T.TREE); lineV(29, 13, 15, T.TREE);
  lineH(1, 18, 15, T.TREE); lineH(22, 42, 15, T.TREE);
  rect(2, 25, 6, 5, T.TREE); rect(34, 25, 8, 5, T.TREE);
  [[2,2],[12,2],[2,12],[12,12],[16,2],[18,3],[25,2],[27,5],[32,18],[41,18],[7,20],[36,20]].forEach(([x,y]) => put(x,y,T.TREE));

  // Ba trục chính gặp nhau tại Hub. Mỗi lối rộng hai ô ở điểm chuyển khu.
  lineH(6, 20, 8, T.WORN_PATH); lineH(6, 20, 9, T.WORN_PATH);
  lineH(20, 34, 11, T.WORN_PATH); lineH(20, 34, 12, T.WORN_PATH);
  lineV(20, 11, 17, T.COBBLE); lineV(21, 11, 17, T.COBBLE);
  rect(16, 9, 10, 5, T.PLAZA);
  lineH(2, 10, 23, T.WORN_PATH); lineH(30, 41, 23, T.WORN_PATH);

  // CAMPUS: Giảng đường, sân lát đá và hai vườn đối xứng, không có encounter.
  rect(1, 1, 13, 8, T.PLAZA);
  rect(2, 8, 3, 4, T.GARDEN); rect(9, 8, 3, 4, T.GARDEN);
  [2, 3, 5, 7, 9, 11, 12].forEach((x) => put(x, 1, T.TREE));
  lineV(7, 8, 13, T.COBBLE);
  lineH(7, 15, 8, T.COBBLE); lineH(7, 15, 9, T.COBBLE);
  rect(2, 2, 11, 4, T.ROOF);
  rect(2, 6, 11, 3, T.WALL);
  put(7, 8, T.DOOR);

  // WILDERNESS: hồ ở phía bắc, hai đồng cỏ encounter ở phía nam.
  rect(34, 2, 8, 7, T.WATER);
  put(34,2,T.MOSS); put(41,2,T.MOSS); put(34,8,T.SHORE); put(41,8,T.SHORE);
  put(33,5,T.BOAT); put(34,5,T.WATER);
  lineH(31, 38, 10, T.GRAVEL); lineV(33, 5, 13, T.GRAVEL);
  rect(31, 11, 4, 4, T.TALL); rect(37, 10, 5, 5, T.TALL);
  lineH(20, 34, 11, T.GRAVEL); lineH(20, 34, 12, T.GRAVEL);
  [[31,2],[32,3],[40,10],[36,13],[41,14],[30,7]].forEach(([x,y]) => put(x,y,T.FLOWER));

  // TRAINER ARENA: vành đai đá, bốn cổng, 15 bục Trainer và Boss giữa sân.
  rect(arena.x - 1, arena.y - 1, arena.width + 2, arena.height + 2, T.COBBLE);
  rect(arena.x + 1, arena.y + 1, arena.width - 2, arena.height - 2, T.DARK_STONE);
  lineV(arena.centerGx, arena.y + 1, arena.y + arena.height - 2, T.BLUE_CARPET);
  lineV(arena.centerGx + 1, arena.y + 1, arena.y + arena.height - 2, T.BLUE_CARPET);
  lineH(arena.x + 1, arena.x + arena.width - 2, arena.centerGy, T.RED_CARPET);
  rect(arena.centerGx - 1, arena.centerGy - 1, 3, 3, T.GOLD);
  for (let x = arena.x; x < arena.x + arena.width; x++) { put(x, arena.y, T.WALL); put(x, arena.y + arena.height - 1, T.WALL); }
  for (let y = arena.y; y < arena.y + arena.height; y++) { put(arena.x, y, T.WALL); put(arena.x + arena.width - 1, y, T.WALL); }
  [[arena.centerGx, arena.y], [arena.centerGx + 1, arena.y], [arena.centerGx, arena.y + arena.height - 1], [arena.centerGx + 1, arena.y + arena.height - 1],
    [arena.x, arena.centerGy], [arena.x + arena.width - 1, arena.centerGy]].forEach(([x, y]) => put(x, y, T.COBBLE));

  const trainerPositions = [
    [12,19], [15,19], [18,19], [23,19], [26,19],
    [12,21], [12,24], [12,27], [28,21], [28,24], [28,27],
    [14,28], [17,28], [23,28], [26,28],
  ];
  trainerPositions.forEach(([x, y]) => put(x, y, T.ARENA));

  // Landmark nhỏ ngoài công trình, tránh đặt lên các trục giao thông.
  [[3,13],[11,13],[16,6],[27,10],[8,14],[32,20],[40,20]].forEach(([x,y]) => put(x,y,T.FLOWER));
  const trainerNpcs = (((window.CONFIG || {}).TRAINER_ARENA || {}).trainers || []).map((trainer, index) => ({
    gx: trainerPositions[index][0], gy: trainerPositions[index][1], type: 'trainer', trainerId: trainer.id, icon: trainer.icon,
  }));

  window.MAP_DATA = {
    TILES: tiles,
    AREAS: areas,
    ARENA: arena,
    SIGNS: [{ gx: 31, gy: 9, label: 'WILDERNESS', color: '#4b9b65' }],
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
      ...trainerNpcs,
      { gx: arena.centerGx, gy: arena.centerGy, type: 'gym', tier: 'N5', icon: '👑', lines: ['👑 Boss N5', 'Thu phục đủ Kanji N5 và chứng minh năng lực trước các Trainer để nhận huy hiệu N5.'] },
    ],
  };
})();
