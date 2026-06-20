import re

with open('architecture_explanation.html', 'r', encoding='utf-8') as f:
    content = f.read()

with open('scratch_style.css', 'r', encoding='utf-8') as f:
    new_css = f.read()

# Replace everything between <style> and </style>
new_content = re.sub(r'<style>.*?</style>', f'<style>\n{new_css}\n    </style>', content, flags=re.DOTALL)

with open('architecture_explanation.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
