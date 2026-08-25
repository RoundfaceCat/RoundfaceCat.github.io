---
title: GeoGebra
date: 2026-05-02 12:00:00
---

## 我认为很好用的绘制函数图像的软件

<div id="ggb-element" style="width:100%;height:600px;max-width:100%;"></div>
<script src="https://www.geogebra.org/apps/deployggb.js"></script>
<script>
  var params = {
    "appName": "graphing",
    "width": 800,
    "height": 600,
    "showToolBar": true,
    "showAlgebraInput": true,
    "showMenuBar": true,
    "showResetIcon": true,
    "enableLabelDrags": false,
    "enableShiftDragZoom": true,
    "borderColor": "#ddd",
    "showLogButton": false,
    "language": "zh"
  };
  var applet = new GGBApplet(params, true);
  window.addEventListener("load", function() {
    applet.inject('ggb-element');
  });
</script>
