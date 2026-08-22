// ============================================================
//  MAP.JS — TILEMAP + NPC.
//  Tile: 0 cỏ|1 cây|2 nước|3 đường|4 hoa|5 bụi cỏ|6 🚤 bến|7 cửa học viện|8 tường|9 mái
// ============================================================
(function () {
  const W = 32, H = 24;
  const T = { GRASS: 0, TREE: 1, WATER: 2, PATH: 3, FLOWER: 4, TALL: 5, BOAT: 6, DOOR: 7, WALL: 8, ROOF: 9 };
  const tiles = Array.from({ length: H }, () => Array(W).fill(T.GRASS));
  const put = (x, y, tile) => { if (x >= 0 && y >= 0 && x < W && y < H) tiles[y][x] = tile; };
  const rect = (x, y, w, h, tile) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, tile);
  };
  const lineH = (x1, x2, y, tile = T.PATH) => { for (let x = x1; x <= x2; x++) put(x, y, tile); };
  const lineV = (x, y1, y2, tile = T.PATH) => { for (let y = y1; y <= y2; y++) put(x, y, tile); };

  // Viền rừng và các cụm cây tạo cảm giác từng khu vực thay vì một sân phẳng.
  lineH(0, W - 1, 0, T.TREE); lineH(0, W - 1, H - 1, T.TREE);
  lineV(0, 0, H - 1, T.TREE); lineV(W - 1, 0, H - 1, T.TREE);
  rect(1, 14, 4, 3, T.TREE);
  rect(27, 13, 4, 3, T.TREE);
  rect(8, 19, 4, 4, T.TREE);
  rect(20, 20, 3, 3, T.TREE);
  [[2,2],[2,3],[9,2],[10,2],[13,4],[14,4],[18,2],[19,2],[29,18],[3,20],[4,20],[25,21]].forEach(([x,y]) => put(x,y,T.TREE));

  // Trục giao thông: học viện → quảng trường trung tâm → hồ / đấu trường / đồng cỏ.
  lineV(5, 4, 12); lineH(2, 29, 12); lineV(16, 2, 21);
  lineH(16, 21, 6); lineH(16, 27, 18); lineV(27, 12, 18);
  lineH(5, 16, 8); lineV(11, 8, 16); lineH(11, 16, 16);
  rect(14, 10, 5, 5, T.PATH);

  // Giảng đường 5×4: hai hàng mái, hai hàng tường và cửa giữa nối thẳng lối chính.
  rect(3, 1, 5, 2, T.ROOF);
  rect(3, 3, 5, 2, T.WALL);
  put(5, 4, T.DOOR);

  // Hồ phía đông bắc, có bờ gấp khúc và bến nối với đường chính.
  rect(23, 3, 7, 7, T.WATER);
  put(23,3,T.GRASS); put(29,3,T.GRASS); put(23,9,T.GRASS); put(29,9,T.GRASS);
  put(22,6,T.BOAT); put(22,7,T.WATER); put(23,6,T.WATER);

  // Ba vùng bụi cỏ: vườn học viện, đồng phía tây nam và thảo nguyên đông nam.
  rect(2, 7, 3, 3, T.TALL);
  rect(5, 16, 5, 3, T.TALL);
  rect(23, 14, 3, 3, T.TALL);
  rect(24, 20, 5, 2, T.TALL);
  [[3,6],[4,6],[8,5],[9,5],[12,6],[13,6],[6,20],[7,20],[25,17],[26,17]].forEach(([x,y]) => put(x,y,T.TALL));

  // Hoa dùng làm landmark nhỏ và phá các mảng cỏ lớn.
  [[2,5],[8,5],[9,10],[13,15],[18,8],[20,11],[21,16],[29,11],[3,18],[15,20],[29,20],[19,4]].forEach(([x,y]) => put(x,y,T.FLOWER));

  window.MAP_DATA = {
    TILES: tiles,
    NPCS: [
      {
        gx: 10, gy: 12,
        lines: [
          'Chào mừng đến khuôn viên KanjiGO mới! 👋',
          'Giữ Shift khi di chuyển để chạy nhanh hơn.',
          'Đứng cạnh hồ, quay mặt về nước rồi nhấn Space để câu cá.',
          '🌿 Bụi cỏ để gặp monster • 🚤 bến phía đông để đi thuyền.',
          '📖 Nhấn D để mở KANJI DEX và chọn pet đi cùng.',
        ],
      },
      { gx: 27, gy: 18, type: 'pve', icon: '⛩', lines: ['⛩ Sàn đấu kỳ thi', 'Space để bắt đầu bài kiểm tra 10 câu.'] },
    ],
  };
})();
