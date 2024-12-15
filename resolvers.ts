import { Collection, ObjectId } from "mongodb";
import { StudentModel, TeacherModel, CourseModel, Student, Teacher, Course } from "./types.ts";

export const resolvers = {
    Query: {
        //Obtener todos los estudiantes
        students: async (_: unknown, __: unknown, { StudentsCollection }: { StudentsCollection: Collection<StudentModel> }): Promise<Student[]> => {
            const students = await StudentsCollection.find().toArray();
            return students.map(student => ({ id: student._id.toString(), name: student.name, email: student.email, enrolledCourses: student.enrolledCourses }));
        },
        //Obtener un estudiante por su ID
        student: async (_: unknown, { id }: { id: string }, { StudentsCollection }: { StudentsCollection: Collection<StudentModel> }): Promise<Student | null> => {
            const student = await StudentsCollection.findOne({ _id: new ObjectId(id) });
            return student ? { id: student._id.toString(), name: student.name, email: student.email, enrolledCourses: student.enrolledCourses } : null;
        },
        //Obtener todos los profesores
        teachers: async (_: unknown, __: unknown, { TeachersCollection }: { TeachersCollection: Collection<TeacherModel> }): Promise<Teacher[]> => {
            const teachers = await TeachersCollection.find().toArray();
            return teachers.map(teacher => ({ id: teacher._id.toString(), name: teacher.name, email: teacher.email, coursesTaught: teacher.coursesTaught }));
        },
        //Obtener un profesor por su ID
        teacher: async (_: unknown, { id }: { id: string }, { TeachersCollection }: { TeachersCollection: Collection<TeacherModel> }): Promise<Teacher | null> => {
            const teacher = await TeachersCollection.findOne({ _id: new ObjectId(id) });
            return teacher ? { id: teacher._id.toString(), name: teacher.name, email: teacher.email, coursesTaught: teacher.coursesTaught } : null;
        },
        //Obtener todos los cursos
        courses: async (_: unknown, __: unknown, { CoursesCollection }: { CoursesCollection: Collection<CourseModel> }): Promise<Course[]> => {
            const courses = await CoursesCollection.find().toArray();
            return courses.map(course => ({ id: course._id.toString(), title: course.title, description: course.description, teacherId: course.teacherId, studentIds: course.studentIds }));
        },
        //Obtener un curso por su ID
        course: async (_: unknown, { id }: { id: string }, { CoursesCollection }: { CoursesCollection: Collection<CourseModel> }): Promise<Course | null> => {
            const course = await CoursesCollection.findOne({ _id: new ObjectId(id) });
            return course ? { id: course._id.toString(), title: course.title, description: course.description, teacherId: course.teacherId, studentIds: course.studentIds } : null
        },
    },

  Mutation: {
        //Crear un estudiante
        createStudent: async (_: unknown, { name, email }: { name: string; email: string }, { StudentsCollection }: { StudentsCollection: Collection<StudentModel> }): Promise<Student> => {
        const { insertedId } = await StudentsCollection.insertOne({ name, email, enrolledCourses: [] });
        return { id: insertedId.toString(), name, email, enrolledCourses: [] };
        },
        //Crear un profesor
        createTeacher: async (_: unknown, { name, email }: { name: string; email: string }, { TeachersCollection }: { TeachersCollection: Collection<TeacherModel> }): Promise<Teacher> => {
        const { insertedId } = await TeachersCollection.insertOne({ name, email, coursesTaught: [] });
        return { id: insertedId.toString(), name, email, coursesTaught: [] };
        },
        //Crear un curso
        createCourse: async (_: unknown, { title, description, teacherId }: { title: string; description: string; teacherId: string }, { CoursesCollection, TeachersCollection }: { CoursesCollection: Collection<CourseModel>; TeachersCollection: Collection<TeacherModel> }): Promise<Course> => {
        const teacher = await TeachersCollection.findOne({ _id: new ObjectId(teacherId) });
        if (!teacher) throw new Error("Teacher not found");
        const { insertedId } = await CoursesCollection.insertOne({ title, description, teacherId, studentIds: [] });
        await TeachersCollection.updateOne({ _id: teacher._id }, { $push: { coursesTaught: insertedId.toString() } });
        return { id: insertedId.toString(), title, description, teacherId, studentIds: [] };
        },
        //Actualizar un estudiante
        updateStudent: async (_: unknown, { id, name, email }: { id: string; name?: string; email?: string }, { StudentsCollection }: { StudentsCollection: Collection<StudentModel> }): Promise<Student | null> => {
            const updateFields: Partial<StudentModel> = {};
            if (name) updateFields.name = name;
            if (email) updateFields.email = email;
            const { value } = await StudentsCollection.findOneAndUpdate(
                { _id: new ObjectId(id) },
                { $set: updateFields },
                { returnDocument: "after" }
            );
            return value ? { id: value._id.toString(), name: value.name, email: value.email, enrolledCourses: value.enrolledCourses } : null;
        },
        //Actualizar un profesor
        updateTeacher: async (_: unknown, { id, name, email }: { id: string; name?: string; email?: string }, { TeachersCollection }: { TeachersCollection: Collection<TeacherModel> }): Promise<Teacher | null> => {
            const updateFields: Partial<TeacherModel> = {};
            if (name) updateFields.name = name;
            if (email) updateFields.email = email;
            const { value } = await TeachersCollection.findOneAndUpdate(
                { _id: new ObjectId(id) },
                { $set: updateFields },
                { returnDocument: "after" }
            );
            return value ? { id: value._id.toString(), name: value.name, email: value.email, coursesTaught: value.coursesTaught } : null;
        },
        //Actualizar un curso
        updateCourse: async (_: unknown, { id, title, description, teacherId }: { id: string; title?: string; description?: string; teacherId?: string }, { CoursesCollection, TeachersCollection }: { CoursesCollection: Collection<CourseModel>; TeachersCollection: Collection<TeacherModel> }): Promise<Course | null> => {
            const updateFields: Partial<CourseModel> = {};
            if (title) updateFields.title = title;
            if (description) updateFields.description = description;
            if (teacherId) {
                const teacher = await TeachersCollection.findOne({ _id: new ObjectId(teacherId) });
                if (!teacher) throw new Error("Teacher not found");
                updateFields.teacherId = teacherId;
                await TeachersCollection.updateOne({ _id: teacher._id }, { $push: { coursesTaught: id } });
            }
            const { value } = await CoursesCollection.findOneAndUpdate(
                { _id: new ObjectId(id) },
                { $set: updateFields },
                { returnDocument: "after" }
            );
            return value ? { id: value._id.toString(), title: value.title, description: value.description, teacherId: value.teacherId, studentIds: value.studentIds } : null;
        },
        //Añadir un estudiante a un curso
        enrollStudentInCourse: async (_: unknown, { studentId, courseId }: { studentId: string; courseId: string }, { StudentsCollection, CoursesCollection }: { StudentsCollection: Collection<StudentModel>; CoursesCollection: Collection<CourseModel> }): Promise<Course> => {
            const student = await StudentsCollection.findOne({ _id: new ObjectId(studentId) });
            const course = await CoursesCollection.findOne({ _id: new ObjectId(courseId) });
            if (!student || !course) throw new Error("Student or course not found");
            const studentUpdateResult = await StudentsCollection.updateOne({ _id: student._id }, { $push: { enrolledCourses: courseId } });
            const courseUpdateResult = await CoursesCollection.updateOne({ _id: course._id }, { $push: { studentIds: studentId } });
            if (studentUpdateResult.modifiedCount === 0 || courseUpdateResult.modifiedCount === 0) {
                throw new Error("Failed to enroll student in course");
            }
            const updatedCourse = await CoursesCollection.findOne({ _id: course._id });
            return { id: updatedCourse!._id.toString(), title: updatedCourse!.title, description: updatedCourse!.description, teacherId: updatedCourse!.teacherId, studentIds: updatedCourse!.studentIds };
        },
        //Eliminar un estudiante de un curso
        removeStudentFromCourse: async (_: unknown, { studentId, courseId }: { studentId: string; courseId: string }, { StudentsCollection, CoursesCollection }: { StudentsCollection: Collection<StudentModel>; CoursesCollection: Collection<CourseModel> }): Promise<Course> => {
            const student = await StudentsCollection.findOne({ _id: new ObjectId(studentId) });
            const course = await CoursesCollection.findOne({ _id: new ObjectId(courseId) });
            if (!student || !course) throw new Error("Student or course not found");
            const studentUpdateResult = await StudentsCollection.updateOne({ _id: student._id }, { $pull: { enrolledCourses: courseId } });
            const courseUpdateResult = await CoursesCollection.updateOne({ _id: course._id }, { $pull: { studentIds: studentId } });
            if (studentUpdateResult.modifiedCount === 0 || courseUpdateResult.modifiedCount === 0) {
                throw new Error("Failed to unenroll student in course");
            }
            const updatedCourse = await CoursesCollection.findOne({ _id: course._id });
            return { id: updatedCourse!._id.toString(), title: updatedCourse!.title, description: updatedCourse!.description, teacherId: updatedCourse!.teacherId, studentIds: updatedCourse!.studentIds };
        },
        //Eliminar un estudiante
        deleteStudent: async (_: unknown, { id }: { id: string }, { StudentsCollection }: { StudentsCollection: Collection<StudentModel> }): Promise<boolean> => {
            const student = await StudentsCollection.findOne({ _id: new ObjectId(id) });
            if (!student) throw new Error("Student not found");
            await StudentsCollection.deleteOne({ _id: new ObjectId(id) });
            return true;
        },
        //Eliminar un profesor
        deleteTeacher: async (_: unknown, { id }: { id: string }, { TeachersCollection }: { TeachersCollection: Collection<TeacherModel> }): Promise<boolean> => {
            const teacher = await TeachersCollection.findOne({ _id: new ObjectId(id) });
            if (!teacher) throw new Error("Teacher not found");
            await TeachersCollection.deleteOne({ _id: new ObjectId(id) });
            return true;
        },
        //Eliminar un curso
        deleteCourse: async (_: unknown, { id }: { id: string }, { CoursesCollection }: { CoursesCollection: Collection<CourseModel> }): Promise<boolean> => {
            const course = await CoursesCollection.findOne({ _id: new ObjectId(id) });
            if (!course) throw new Error("Course not found");
            await CoursesCollection.deleteOne({ _id: new ObjectId(id) });
            return true;
        },
    },
};