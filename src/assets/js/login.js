// Fungsi untuk menampilkan pesan di message box (konsisten dengan register.js)
function showMessage(message, isError = false) {
    const msgBox = document.getElementById('messageBox');
    if (!msgBox) {
        console.error("Elemen 'messageBox' tidak ditemukan!");
        alert(message); // fallback ke alert jika box tidak ada
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
    // Animasi form saat halaman dimuat (konsisten dengan register.js)
    const loginFormContainer = document.getElementById('login-form-container');
    if (loginFormContainer) {
        setTimeout(() => {
            loginFormContainer.classList.remove('hidden-form');
            loginFormContainer.classList.add('visible-form');
        }, 500);
    } else {
        console.warn("Elemen 'login-form-container' tidak ditemukan, animasi form tidak akan berjalan.");
    }

    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Ambil nilai input
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');

            if (!emailInput || !passwordInput) {
                console.error("Salah satu elemen input form tidak ditemukan di HTML.");
                showMessage('Terjadi kesalahan pada form. Mohon refresh halaman.', true);
                return;
            }

            const email = emailInput.value;
            const password = passwordInput.value;

                try {
                    // Kirim data ke server
                    const response = await fetch('/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email, password })
                    });

                    // Tambahkan debug untuk respons
                    console.log('Response status:', response.status);

                    // Coba baca respons JSON
                    let responseData;
                    try {
                        responseData = await response.json();
                        console.log('Response data:', responseData);
                    } catch (jsonError) {
                        // Jika respons bukan JSON, tampilkan error
                        console.error('Gagal membaca JSON dari respons:', jsonError);
                        showMessage('Respons server tidak dalam format yang diharapkan.', true);
                        return;
                    }

                    // Periksa status respons
                    if (response.ok) {
                        // Jika sukses
                        showMessage(responseData.message || 'Login berhasil!');
                        loginForm.reset(); // Bersihkan form

                        setTimeout(() => {
                            window.location.href = '/dashboard'; // Redirect
                        }, 1500);
                    } else {
                        // Jika error, tampilkan pesan dari server
                        showMessage(responseData.message || 'Terjadi kesalahan saat login.', true);
                    }
                } catch (error) {
                    // Jika terjadi error jaringan atau lainnya
                    console.error('Error saat login:', error);
                    showMessage('Terjadi kesalahan jaringan atau server tidak merespons.', true);
                }
            });
        } else {
            console.error("Formulir dengan ID 'loginForm' tidak ditemukan!");
        }
});