// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import session from "express-session";
import pgSession from "connect-pg-simple";
import bcrypt from "bcryptjs";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import { engine } from 'express-handlebars';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;

// Koneksi database PostgreSQL
const db = new Pool({
  user: 'postgres',
  password: '010901',
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  max: 20,
});

// Konfigurasi Multer untuk upload gambar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'src/assets/uploads/');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Inisialisasi session store PostgreSQL
const PgSession = pgSession(session);
const sessionStore = new PgSession({
  pool: db,
  tableName: 'session',
});

// Konfigurasi session dengan store
app.use(session({
  store: sessionStore,
  secret: 'sangat_rahasia_kunci_sesi_anda', // Ganti dengan kunci yang kuat
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 hari
  }
}));

// Middleware cek autentikasi
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Konfigurasi Handlebars sebagai view engine
app.engine('hbs', engine({
  extname: '.hbs', 
  defaultLayout: false,
  helpers: {
    inc: (value) => parseInt(value) + 1,
  }
}));

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "src/views"));


// Static files (pastikan semua ini ada dan benar)
app.use("/assets", express.static(path.join(__dirname, "src/assets")));
app.use("/uploads", express.static(path.join(__dirname, "src/assets/uploads")));
app.use("/image", express.static(path.join(__dirname, "src/assets/image")));


// Homepage
app.get("/", async (req, res) => {
  try {
    const techStacks = await db.query("SELECT * FROM tech_stack ORDER BY id DESC");
    const workExperiences = await db.query("SELECT * FROM work_experience ORDER BY id DESC");
    const projects = await db.query("SELECT * FROM projects ORDER BY id DESC");

    const formattedExperiences = workExperiences.rows.map(item => ({
      ...item,
      description_lines: item.description_lines || []
    }));

    const formattedProjects = projects.rows.map(item => ({
      ...item,
      tech_stack_array: item.tech_stack_array || []
    }));

    let fullname = null;
    let profileImage = null;

    if (req.session.user?.id) {
      const result = await db.query(
        "SELECT fullname, profile_image_path FROM tb_users WHERE id = $1",
        [req.session.user.id]
      );
      if (result.rows.length > 0) {
        fullname = result.rows[0].fullname;
        profileImage = result.rows[0].profile_image_path;
      }
    }

    res.render("users/portfolio", {
      techStacks: techStacks.rows,
      workExperiences: formattedExperiences,
      projects: formattedProjects,
      fullname,
      profileImage
    });
  } catch (err) {
    console.error("Gagal memuat data portfolio:", err);
    res.status(500).send("Internal Server Error");
  }
});



// Login page
app.get("/login", (req, res) => {
  res.render("login");
});

// Login process
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const { rows } = await db.query("SELECT * FROM tb_users WHERE email = $1", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Email atau kata sandi salah!" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Email atau kata sandi salah!" });
    }

    // Set sesi pengguna
    req.session.user = {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      profile_image_path: user.profile_image_path
    };

    req.session.save((err) => {
      if (err) {
        console.error("Error saving session after login:", err);
        return res.status(500).json({ message: "Gagal menyimpan sesi." });
      }
      res.json({ message: "Login berhasil" });
    });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Terjadi kesalahan saat login." });
  }
});

// Register page
app.get("/register", (req, res) => {
  res.render("register");
});

// Register process
app.post("/register", upload.single("profile_image"), async (req, res) => {
  console.log("File upload:", req.file);
  console.log("Body:", req.body);
  
  const { fullname, email, password } = req.body;
  const profileImagePath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const { rows: existingUser } = await db.query("SELECT * FROM tb_users WHERE email = $1", [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Email sudah terdaftar. Silakan gunakan email lain." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO tb_users (fullname, email, password, profile_image_path) VALUES ($1, $2, $3, $4)",
      [fullname, email, hashedPassword, profileImagePath]
    );

    res.status(201).json({ message: "Registrasi berhasil! Silakan login." });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ message: "Terjadi kesalahan saat registrasi." });
  }
});

// ROUTE DASHBOARD
app.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.redirect("/login");

    const userResult = await db.query(
      "SELECT fullname, profile_image_path FROM tb_users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.redirect("/login");
    }

    const tech = await db.query("SELECT * FROM tech_stack ORDER BY id DESC");
    const exp = await db.query("SELECT * FROM work_experience ORDER BY id DESC");
    const proj = await db.query("SELECT * FROM projects ORDER BY id DESC");

    res.render("dashboard/admin", {
      fullname: userResult.rows[0].fullname,
      profileImage: userResult.rows[0].profile_image_path,
      techStacks: tech.rows,
      workExperiences: exp.rows.map(item => ({
        ...item,
        description_lines: item.description ? item.description.split('\n') : []
      })),
      projects: proj.rows.map(item => ({
        ...item,
        tech_stack_array: item.tech_stack ? item.tech_stack.split(',').map(s => s.trim()) : []
      })),
    });
  } catch (err) {
    console.error("Error loading dashboard:", err);
    res.status(500).send("Terjadi kesalahan.");
  }
});


/* tech stack upload ,edit dan hapus*/
app.post("/dashboard/techstack", upload.single("logo"), async (req, res) => {
  const { name } = req.body;
  const logo_path = req.file ? `/uploads/${req.file.filename}` : null; // Handle case where no file is uploaded (though 'required' on frontend makes it less likely)
  if (!logo_path) {
    return res.status(400).send("Logo file is required for new tech stack.");
  }
  try {
    await db.query("INSERT INTO tech_stack (name, logo_path) VALUES ($1, $2)", [name, logo_path]);
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error inserting tech stack:", error);
    res.status(500).send("Failed to add tech stack.");
  }
});

// NEW ROUTE: For Updating Existing Tech Stack
app.post("/dashboard/techstack/update/:id", upload.single("logo"), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const new_logo_path = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    let queryText;
    let queryParams;

    if (new_logo_path) {
      // If a new logo is uploaded, update both name and logo_path
      queryText = `UPDATE tech_stack SET name = $1, logo_path = $2 WHERE id = $3`;
      queryParams = [name, new_logo_path, id];
    } else {
      // If no new logo, only update the name
      queryText = `UPDATE tech_stack SET name = $1 WHERE id = $2`;
      queryParams = [name, id];
    }

    await db.query(queryText, queryParams);
    res.redirect("/dashboard"); // Redirect back to dashboard after update
  } catch (error) {
    console.error("Error updating tech stack:", error);
    res.status(500).send("Failed to update tech stack.");
  }
});

// Existing route for deleting tech stack (no change needed here)
app.post("/dashboard/techstack/delete/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM tech_stack WHERE id = $1", [req.params.id]);
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error deleting tech stack:", error);
    res.status(500).send("Failed to delete tech stack.");
  }
});

// Ensure your dashboard GET route fetches tech stacks
app.get("/dashboard", async (req, res) => {
  try {
    const workExperiencesResult = await db.query("SELECT * FROM work_experience ORDER BY id ASC");
    const techStacksResult = await db.query("SELECT * FROM tech_stack ORDER BY id ASC");

    res.render("dashboard", {
      workExperiences: workExperiencesResult.rows,
      techStacks: techStacksResult.rows
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).send("Error loading dashboard.");
  }
});



// Rute untuk Upload Baru (tetap seperti semula)
app.post("/dashboard/experience", upload.single("image"), async (req, res) => {
  const { title, company, duration_text, description } = req.body;
  const logoPath = req.file ? `/uploads/${req.file.filename}` : null;
  const lines = description.split("\n");

  try {
    await db.query(`
      INSERT INTO work_experience (title, company, duration_text, description_lines, company_logo_path)
      VALUES ($1, $2, $3, $4, $5)
    `, [title, company, duration_text, lines, logoPath]);
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error uploading experience:", error);
    res.status(500).send("Failed to upload experience.");
  }
});

// Rute untuk Update (Edit) Experience
app.post("/dashboard/experience/update/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params; // ID dari URL
  const { title, company, duration_text, description } = req.body; // Data dari form
  const logoPath = req.file ? `/uploads/${req.file.filename}` : null; // New logo path if uploaded
  const lines = description.split("\n");

  try {
    let queryText = `
      UPDATE work_experience
      SET title = $1, company = $2, duration_text = $3, description_lines = $4
      WHERE id = $5
    `;
    let queryParams = [title, company, duration_text, lines, id];

    // Jika ada gambar baru diupload, update juga company_logo_path
    if (logoPath) {
      queryText = `
        UPDATE work_experience
        SET title = $1, company = $2, duration_text = $3, description_lines = $4, company_logo_path = $5
        WHERE id = $6
      `;
      queryParams = [title, company, duration_text, lines, logoPath, id];
    }

    await db.query(queryText, queryParams);
    res.redirect("/dashboard"); // Redirect kembali ke dashboard setelah update berhasil

  } catch (error) {
    console.error("Error updating work experience:", error);
    res.status(500).send("Failed to update experience.");
  }
});

// Rute untuk Delete (tetap seperti semula)
app.post("/dashboard/experience/delete/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM work_experience WHERE id = $1", [id]);
  res.redirect("/dashboard");
});

// Pastikan Anda juga memiliki rute GET untuk dashboard yang merender semua data pengalaman
app.get("/dashboard", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM work_experience ORDER BY id ASC");
    res.render("dashboard", { workExperiences: result.rows }); // Pastikan 'dashboard' adalah nama template Anda
  } catch (error) {
    console.error("Error fetching work experiences:", error);
    res.status(500).send("Error loading dashboard.");
  }
});
// Existing route for uploading new project
app.post("/dashboard/project", upload.single("image"), async (req, res) => {
  const { title, description, tech_stack, repo_link, demo_link } = req.body;
  const image_path = req.file ? `/uploads/${req.file.filename}` : null;

  // Convert comma-separated string to an array
  const techStackArray = tech_stack ? tech_stack.split(',').map(item => item.trim()) : [];

  try {
    await db.query(
      `INSERT INTO projects (title, description, tech_stack_array, repo_link, demo_link, image_path)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [title, description, techStackArray, repo_link, demo_link, image_path] // Use techStackArray here
    );
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error inserting project:", error);
    res.status(500).send("Failed to add project.");
  }
});

// Route for Updating Existing Project
app.post("/dashboard/project/update/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { title, description, tech_stack, repo_link, demo_link } = req.body;
  const new_image_path = req.file ? `/uploads/${req.file.filename}` : null;

  // Convert comma-separated string to an array for update
  const techStackArray = tech_stack ? tech_stack.split(',').map(item => item.trim()) : [];

  try {
    let queryText;
    let queryParams;

    if (new_image_path) {
      queryText = `
        UPDATE projects
        SET title = $1, description = $2, tech_stack_array = $3, repo_link = $4, demo_link = $5, image_path = $6
        WHERE id = $7
      `;
      queryParams = [title, description, techStackArray, repo_link, demo_link, new_image_path, id];
    } else {
      queryText = `
        UPDATE projects
        SET title = $1, description = $2, tech_stack_array = $3, repo_link = $4, demo_link = $5
        WHERE id = $6
      `;
      queryParams = [title, description, techStackArray, repo_link, demo_link, id];
    }

    await db.query(queryText, queryParams);
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).send("Failed to update project.");
  }
});

app.post("/dashboard/project/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Ambil path gambar terlebih dahulu
    const result = await db.query(`SELECT image_path FROM projects WHERE id = $1`, [id]);
    const project = result.rows[0];

    // Hapus record dari database
    await db.query(`DELETE FROM projects WHERE id = $1`, [id]);

    // Jika ada gambar, hapus file dari sistem
    if (project && project.image_path) {
      const filePath = path.join(__dirname, "public", project.image_path);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Gagal menghapus gambar:", err);
        } else {
          console.log("Gambar berhasil dihapus:", project.image_path);
        }
      });
    }

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).send("Failed to delete project.");
  }
});
// Ensure your main dashboard GET route fetches projects data
app.get("/dashboard", async (req, res) => {
  try {
    const workExperiencesResult = await db.query("SELECT * FROM work_experience ORDER BY id ASC");
    const techStacksResult = await db.query("SELECT * FROM tech_stack ORDER BY id ASC");
    const projectsResult = await db.query("SELECT * FROM projects ORDER BY id ASC"); // Fetch projects

    res.render("dashboard", {
      workExperiences: workExperiencesResult.rows,
      techStacks: techStacksResult.rows,
      projects: projectsResult.rows // Pass projects data to the template
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).send("Error loading dashboard.");
  }
});

// LOGOUT AKUN ADMIN
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Error during logout:", err);
    }
    res.redirect("/login");
  });
});

// --- ROUTES API UNTUK CLIENT-SIDE FETCH ---
app.get("/api/tech-stacks", async (req, res) => {
    try {
        const techStacks = await db.query("SELECT * FROM tech_stack ORDER BY id DESC");
        res.json(techStacks.rows);
    } catch (error) {
        console.error("Error fetching tech stacks:", error);
        res.status(500).json({ message: "Failed to fetch tech stacks" });
    }
});

app.get("/api/work-experience", async (req, res) => {
    try {
        const experiences = await db.query("SELECT * FROM work_experience ORDER BY id DESC");
        const formattedExperiences = experiences.rows.map(item => ({
            ...item,
            description_lines: item.description_lines ? item.description_lines : [],
        }));
        res.json(formattedExperiences);
    } catch (error) {
        console.error("Error fetching work experiences:", error);
        res.status(500).json({ message: "Failed to fetch work experiences" });
    }
});

app.get("/api/projects", async (req, res) => {
    try {
        const projects = await db.query("SELECT * FROM projects ORDER BY id DESC");
        const formattedProjects = projects.rows.map(item => ({
            ...item,
            tech_stack_array: item.tech_stack_array ? item.tech_stack_array : [],
        }));
        res.json(formattedProjects);
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ message: "Failed to fetch projects" });
    }
});


// Server jalan
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
}); 