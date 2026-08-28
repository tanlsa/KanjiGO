(function () {
  function resolveWorldZoom(canvasWidth, configuredZoom, academyWidth, tileSize) {
    if (canvasWidth >= 620) return configuredZoom;
    return Math.max(1, Math.min(configuredZoom, canvasWidth / (academyWidth * tileSize + 16)));
  }

  function resolveRenderPixelRatio({ width, height, cssScale, devicePixelRatio, render }) {
    const deviceRatio = Math.max(1, Number(devicePixelRatio) || 1);
    const samples = Math.min(deviceRatio, Math.max(1, Number(render.maxDevicePixelRatio || render.maxPixelRatio) || 2));
    const wanted = cssScale * samples;
    const budget = Math.sqrt(Math.max(1, Number(render.maxRenderPixels) || width * height) / Math.max(1, width * height));
    return Math.max(1, Math.min(wanted, budget));
  }

  function quizPanelLayout(config, width, height) {
    const ui = config.UI || {}, narrow = width < 520, shortLandscape = !narrow && height <= 520;
    const preferred = narrow ? Math.round(height * .4) : Math.round(height * .31);
    const panel = shortLandscape ? 180 : narrow ? Math.max(258, Math.min(292, preferred)) : Math.max(ui.panelH || 200, Math.min(224, preferred));
    const panelH = shortLandscape ? panel : Math.min(panel, Math.max(184, height - (narrow ? 250 : 170)));
    const y = height - panelH, pad = narrow ? 12 : shortLandscape ? 12 : 22;
    const answerGapX = narrow ? 8 : shortLandscape ? 7 : 20;
    const answerGapY = narrow ? 9 : Math.max(8, ui.answerGapY || 8);
    const answerH = narrow ? Math.max(42, Math.min(50, Math.floor((panelH - 166) / 2))) : shortLandscape ? 44 : Math.max(36, ui.answerH || 36);
    const answerStartY = y + (narrow ? 116 : shortLandscape ? 102 : 98), answerCols = shortLandscape ? 4 : 2;
    return { W: width, H: height, narrow, shortLandscape, panelH, y, pad, answerCols, answerGapX, answerGapY, answerH,
      answerStartY, answerW: (width - pad * 2 - answerGapX * (answerCols - 1)) / answerCols };
  }

  window.KanjiGORenderer = Object.freeze({ resolveWorldZoom, resolveRenderPixelRatio, quizPanelLayout });
})();
