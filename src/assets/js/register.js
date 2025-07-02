// Fungsi untuk menampilkan pesan di message box
function showMessage(message, isError = false) {
    const msgBox = document.getElementById('messageBox');
    if (!msgBox) {
        console.error("Elemen 'messageBox' tidak ditemukan!");
        alert(message); // Fallback ke alert jika box tidak ada
        return;
    }
    msgBox.textContent = message;
    msgBox.classList.remove('error');
    if (isError) {
        msgBox.classList.add('error');
    }
    msgBox.classList.add('show');
    setTimeout(() => {
        msgBox.classList.remove('show');
    }, 3000); // Pesan akan hilang setelah 3 detik
}

document.addEventListener('DOMContentLoaded', () => {
    const registerFormContainer = document.getElementById('register-form-container');
    if (registerFormContainer) {
        setTimeout(() => {
            registerFormContainer.classList.remove('hidden-form');
            registerFormContainer.classList.add('visible-form');
        }, 500);
    } else {
        console.warn("Elemen 'register-form-container' tidak ditemukan.");
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const fullnameInput = document.getElementById('fullname');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirm_password');
            const fileInput = document.getElementById('profile_image');

            if (!fullnameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
                console.error("Salah satu elemen input tidak ditemukan.");
                showMessage('Terjadi kesalahan pada form. Mohon refresh halaman.', true);
                return;
            }

            const fullname = fullnameInput.value;
            const email = emailInput.value;
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Validasi
            if (password !== confirmPassword) {
                showMessage('Kata sandi dan konfirmasi tidak cocok!', true);
                return;
            }
            if (password.length < 6) {
                showMessage('Kata sandi minimal 6 karakter.', true);
                return;
            }

            // Buat FormData dan masukkan semua field
            const formData = new FormData();
            formData.append('fullname', fullname);
            formData.append('email', email);
            formData.append('password', password);
            if (fileInput && fileInput.files.length > 0) {
                formData.append('profile_image', fileInput.files[0]);
            }

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    showMessage(data.message || 'Registrasi berhasil! Silakan login.');
                    registerForm.reset();
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1500);
                } else {
                    const errorData = await response.json();
                    showMessage(errorData.message || 'Terjadi kesalahan saat registrasi.', true);
                }
            } catch (error) {
                console.error('Error saat registrasi:', error);
                showMessage('Terjadi kesalahan jaringan atau server tidak merespons.', true);
            }
        });
    } else {
        console.error("Formulir dengan ID 'registerForm' tidak ditemukan!");
    }
});
