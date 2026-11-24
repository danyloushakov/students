#target photoshop
/*
 * Експорт загального арту для сайту (урок 11, New Era).
 * Запуск: відкрий MASTER.psd → File → Scripts → Browse… → tools/export-art.jsx
 *
 * 1. Оновлює всі змінені Linked Smart Objects (Update All Modified Content).
 * 2. Кожен шар зберігає як PNG на ВЕСЬ холст 1920×1080 (прозорий фон) — так позиція шару не губиться.
 * 3. Пише master-assets/layers.json — порядок шарів знизу вгору. Сторінка команди складає з них арт.
 * 4. Зберігає MASTER.psd. Далі: Sourcetree → Stage All → Commit → Push.
 */
app.displayDialogs = DialogModes.NO;
app.preferences.rulerUnits = Units.PIXELS;

(function () {
  if (!app.documents.length) { alert("Відкрий MASTER.psd"); return; }
  var master = app.activeDocument;
  var root = master.path;
  var outDir = new Folder(root + "/master-assets");
  if (!outDir.exists) outDir.create();

  try { executeAction(stringIDToTypeID("placedLayerUpdateAllModified"), undefined, DialogModes.NO); } catch (e) {}

  var W = master.width.as("px"), H = master.height.as("px");
  var png = new PNGSaveOptions(); png.compression = 6; png.interlaced = false;
  var order = []; // знизу вгору
  var clean = function (n) { return n.replace(/\.png$/i, "").replace(/[^A-Za-z0-9._-]+/g, "_"); };

  // master.layers: [0] — верхній шар. Йдемо знизу вгору.
  for (var i = master.layers.length - 1; i >= 0; i--) {
    var L = master.layers[i];
    if (!L.visible) continue;
    var name = L.isBackgroundLayer ? "background" : clean(L.name);
    var doc = app.documents.add(W, H, master.resolution, name, NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    app.activeDocument = master;
    L.duplicate(doc, ElementPlacement.PLACEATBEGINNING);
    app.activeDocument = doc;
    doc.saveAs(new File(outDir + "/" + name + ".png"), png, true, Extension.LOWERCASE);
    doc.close(SaveOptions.DONOTSAVECHANGES);
    order.push(name);
  }
  app.activeDocument = master;

  var json = '{\n  "width": ' + W + ',\n  "height": ' + H + ',\n  "layers": [\n';
  for (var k = 0; k < order.length; k++) json += '    "' + order[k] + '"' + (k < order.length - 1 ? ",\n" : "\n");
  json += "  ]\n}\n";
  var f = new File(outDir + "/layers.json");
  f.encoding = "UTF-8"; f.open("w"); f.write(json); f.close();

  master.save();
  if (!$.global.NEWERA_SILENT) {
    try { alert("Готово: " + order.length + " шарів у master-assets. Тепер Commit → Push."); } catch (e) {}
  }
})();
