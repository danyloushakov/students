const {app,BrowserWindow}=require('electron');
const path=require('path');
function createWindow(){const win=new BrowserWindow({width:1280,height:900,minWidth:850,minHeight:650,backgroundColor:'#101318',webPreferences:{contextIsolation:true}});win.loadFile(path.join(__dirname,'index.html'));}
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
