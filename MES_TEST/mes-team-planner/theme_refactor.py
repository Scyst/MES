import os
import re

replacements = {
    r'\bbg-slate-950\b': 'bg-slate-50 dark:bg-slate-950',
    r'\bbg-slate-900\b': 'bg-white dark:bg-slate-900',
    r'\bbg-slate-900/([0-9]+)\b': r'bg-slate-100/\1 dark:bg-slate-900/\1',
    r'\bbg-slate-800/([0-9]+)\b': r'bg-slate-100/\1 dark:bg-slate-800/\1',
    r'\bbg-slate-800\b': 'bg-slate-100 dark:bg-slate-800',
    r'\bbg-slate-700/([0-9]+)\b': r'bg-slate-200/\1 dark:bg-slate-700/\1',
    r'\bbg-slate-700\b': 'bg-slate-200 dark:bg-slate-700',
    r'\bbg-slate-600\b': 'bg-slate-300 dark:bg-slate-600',
    r'\bborder-slate-800/([0-9]+)\b': r'border-slate-300/\1 dark:border-slate-800/\1',
    r'\bborder-slate-800\b': 'border-slate-200 dark:border-slate-800',
    r'\bborder-slate-700/([0-9]+)\b': r'border-slate-300/\1 dark:border-slate-700/\1',
    r'\bborder-slate-700\b': 'border-slate-300 dark:border-slate-700',
    r'\bborder-slate-600\b': 'border-slate-400 dark:border-slate-600',
    r'\btext-white\b': 'text-slate-900 dark:text-white',
    r'\btext-slate-200\b': 'text-slate-800 dark:text-slate-200',
    r'\btext-slate-300\b': 'text-slate-700 dark:text-slate-300',
    r'\btext-slate-400\b': 'text-slate-600 dark:text-slate-400',
    r'\bbg-indigo-500/([0-9]+)\b': r'bg-indigo-500/10 dark:bg-indigo-500/\1',
    r'\bhover:bg-slate-800/([0-9]+)\b': r'hover:bg-slate-200 dark:hover:bg-slate-800/\1',
    r'\bhover:bg-slate-800\b': 'hover:bg-slate-200 dark:hover:bg-slate-800',
    r'\bhover:bg-slate-700\b': 'hover:bg-slate-300 dark:hover:bg-slate-700',
    r'\bhover:text-white\b': 'hover:text-slate-900 dark:hover:text-white',
    r'\bfrom-slate-900\b': 'from-white dark:from-slate-900',
    r'\bto-slate-800\b': 'to-slate-100 dark:to-slate-800',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, repl in replacements.items():
        safe_pattern = r'(?<!dark:)(?<!-)(?<!:)' + pattern
        new_content = re.sub(safe_pattern, repl, new_content)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

# Process src/components/
for filename in os.listdir('src/components'):
    if filename.endswith('.jsx'):
        process_file(os.path.join('src/components', filename))
