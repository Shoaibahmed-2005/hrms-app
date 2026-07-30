import fs from 'fs';
import path from 'path';

function walk(dir: string, callback: (path: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, callback);
    } else if (fullPath.endsWith('.tsx')) {
      callback(fullPath);
    }
  }
}

walk(path.join(process.cwd(), 'src'), (file) => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Apply sleeker shadows and borders
  content = content.replace(/shadow-\[var\(--shadow-elevate-sm\)\]/g, 'shadow-xl shadow-slate-200/50 dark:shadow-none');
  content = content.replace(/rounded-xl border bg-card/g, 'rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card');
  content = content.replace(/rounded-xl border  bg-card/g, 'rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card'); // with 2 spaces
  
  // also fix standard shadow-sm in cards (attendance-history, announcements)
  content = content.replace(/rounded-xl border bg-card(.*?)shadow-sm/g, 'rounded-2xl border border-slate-100 dark:border-[#1B3A5C] bg-card$1shadow-xl shadow-slate-200/50 dark:shadow-none');

  fs.writeFileSync(file, content, 'utf8');
});

console.log('UI styles updated!');
