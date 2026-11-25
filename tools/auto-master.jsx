#target photoshop
/*
 * New Era, lesson 11: render master-assets/MASTER.png from MASTER.psd.
 * Called by tools/auto-master.ps1. MASTER.psd itself is NOT saved (students' work lives in students/*.psb).
 * If MASTER.psd is already open in Photoshop, it is used as is and left open.
 */
app.displayDialogs = DialogModes.NO;
(function () {
  var log = new File(Folder.temp + "/newera-auto-master.log");
  var msg = "";
  try {
    var root = new File($.fileName).parent.parent; // tools/.. = repo root
    var file = new File(root + "/MASTER.psd");
    var doc = null, opened = false;
    for (var i = 0; i < app.documents.length; i++) {
      var d = app.documents[i];
      try { if (d.fullName.fsName.toLowerCase() === file.fsName.toLowerCase()) doc = d; } catch (e) {}
    }
    if (!doc) { doc = app.open(file); opened = true; }
    app.activeDocument = doc;
    try { executeAction(stringIDToTypeID("placedLayerUpdateAllModified"), undefined, DialogModes.NO); } catch (e) {}
    var out = new Folder(root + "/master-assets");
    if (!out.exists) out.create();
    var png = new PNGSaveOptions(); png.compression = 6; png.interlaced = false;
    doc.saveAs(new File(out + "/MASTER.png"), png, true, Extension.LOWERCASE);
    msg = "ok";
    if (opened) doc.close(SaveOptions.DONOTSAVECHANGES);
  } catch (e) { msg = "error " + e; }
  log.encoding = "UTF-8"; log.open("w"); log.write(msg); log.close();
})();
