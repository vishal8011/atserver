const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
// hello veere
const app = express();
const PORT = 5000;

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
mongoose.connect("mongodb+srv://vraj3918011:QYCkWCUriScv8KP9@vvs.p6vnb3m.mongodb.net/attendences", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log(" MongoDB connected"))
    .catch(err => {
        console.error(" DB Connection Error:", err);
        process.exit(1);
    });

// ✅ Schema + Model
const StudentSchema = new mongoose.Schema({
    name: String,
    dob: String,
    fatherName: String,
    motherName: String,
    phone: String,
    qualification: String,
    course: String,
    duration: String,
    attendance: [
        {
            date: String,
            status: String,
        }
    ],
});

const Student = mongoose.model("Student", StudentSchema);

// ✅ Health check route
app.get("/", (req, res) => {
    res.send("Skill Boost API server is running!");
});

// ✅ Add a new student
app.post("/api/students", async (req, res) => {
    try {
        const student = new Student(req.body);
        await student.save();
        res.status(201).send({ message: "Student added successfully!", student });
    } catch (err) {
        res.status(500).send({ error: "Failed to save student" });
    }
});

// ✅ Get all students
app.get("/api/students", async (req, res) => {
    try {
        const students = await Student.find();
        res.status(200).send(students);
    } catch (err) {
        res.status(500).send({ error: "Failed to fetch students" });
    }
});

// ✅ Submit attendance
app.post("/api/submit-attendance", async (req, res) => {
    console.log("📥 Received Attendance Data:", req.body);

    const students = req.body.students;
    const today = new Date().toISOString().split("T")[0];

    if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).send({ success: false, error: "No students data provided" });
    }

    try {
        for (const student of students) {
            if (!student._id || !student.status) {
                console.warn(" Skipping invalid student entry:", student);
                continue;
            }

            const existingStudent = await Student.findById(student._id);
            if (!existingStudent) {
                console.warn(` Student not found with ID: ${student._id}`);
                continue;
            }

            const alreadyMarked = existingStudent.attendance.some(a => a.date === today);
            if (alreadyMarked) {
                console.log(`ℹ Attendance already marked for ID: ${student._id}`);
                continue;
            }

            await Student.findByIdAndUpdate(
                student._id,
                {
                    $push: {
                        attendance: {
                            date: today,
                            status: student.status,
                        },
                    },
                }
            );

            console.log(` Attendance updated for ID: ${student._id}`);
        }

        res.status(200).send({ success: true, message: "Attendance updated successfully" });
    } catch (err) {
        console.error(" Error updating attendance:", err.message);
        res.status(500).send({ success: false, error: "Failed to update attendance" });
    }
});

// ✅ Delete student
app.delete("/api/students/:id", async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.status(200).send({ message: "Student deleted" });
    } catch (err) {
        res.status(500).send({ error: "Failed to delete student" });
    }
});

// ✅ Get attendance by student ID (used in frontend "View Attendance" button)
app.get("/api/attendance/student/:id", async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).send({ error: "Student not found" });

        res.status(200).send(student.attendance || []);
    } catch (err) {
        console.error("Fetch attendance error:", err);
        res.status(500).send({ error: "Failed to fetch attendance" });
    }
});

// ✅ Get attendance by name (optional, used in other features)
app.get("/api/attendance/name/:name", async (req, res) => {
    try {
        const name = req.params.name;
        const student = await Student.findOne({ name: new RegExp(`^${name}$`, "i") });

        if (!student) return res.status(404).send({ error: "Student not found" });

        res.status(200).send({
            name: student.name,
            course: student.course,
            status: student.attendance.length
                ? student.attendance[student.attendance.length - 1].status
                : "No attendance data",
        });
    } catch (err) {
        res.status(500).send({ error: "Failed to fetch attendance by name" });
    }
});

// ✅ Update student
app.put("/api/students/:id", async (req, res) => {
    try {
        const updatedStudent = await Student.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!updatedStudent) {
            return res.status(404).send({ error: "Student not found" });
        }
        res.status(200).send({ message: "Student updated", student: updatedStudent });
    } catch (err) {
        res.status(500).send({ error: "Failed to update student" });
    }
});

// ✅ Start server
app.listen(PORT, () => {
    console.log(` Server running at http://localhost:${PORT}`);
});
