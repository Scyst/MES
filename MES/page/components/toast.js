function showToast(message, color = '#28a745') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.backgroundColor = color;
    toast.style.opacity = 1;
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
        toast.style.opacity = 0;
        toast.style.transform = 'translateY(20px)';
    }, 3000);
}