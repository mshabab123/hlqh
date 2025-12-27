import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function ClassGrades() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token");

        const [classRes, gradesRes] = await Promise.all([
          axios.get(`${API_BASE}/api/classes/${classId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/api/classes/${classId}/grades-summary`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setClassInfo(classRes.data || null);
        setGrades(Array.isArray(gradesRes.data) ? gradesRes.data : []);
      } catch (err) {
        console.error("Error loading class grades:", err);
        setError("\u062d\u062f\u062b \u062e\u0637\u0623 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062f\u0631\u062c\u0627\u062a.");
      } finally {
        setLoading(false);
      }
    };

    if (classId) {
      fetchData();
    }
  }, [classId]);

  const tableData = useMemo(() => {
    const courseNames = Array.from(new Set(grades.map((row) => row.course_name))).sort(
      (a, b) => a.localeCompare(b, "ar")
    );

    const studentMap = new Map();
    const courseTotals = new Map();

    grades.forEach((row) => {
      const studentId = row.student_id;
      const name = `${row.first_name} ${row.last_name}`.trim();
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, { name, courses: {} });
      }
      const entry = studentMap.get(studentId);
      const key = row.course_name;
      if (!entry.courses[key]) {
        entry.courses[key] = { sum: 0, count: 0 };
      }
      if (!courseTotals.has(key)) {
        courseTotals.set(key, { sum: 0, count: 0 });
      }

      if (row.percentage_score !== null && row.percentage_score !== undefined) {
        const value = Number(row.percentage_score);
        entry.courses[key].sum += value;
        entry.courses[key].count += 1;
        courseTotals.get(key).sum += value;
        courseTotals.get(key).count += 1;
      }
    });

    const students = Array.from(studentMap.entries()).map(([studentId, data]) => {
      const courseAverages = courseNames.map((course) => {
        const stats = data.courses[course];
        if (!stats || stats.count === 0) return null;
        return stats.sum / stats.count;
      });
      const valid = courseAverages.filter((v) => v !== null);
      const overallAvg =
        valid.length > 0 ? valid.reduce((sum, v) => sum + v, 0) / valid.length : null;

      return { studentId, name: data.name, courseAverages, overallAvg };
    });

    const courseAverages = courseNames.map((course) => {
      const stats = courseTotals.get(course);
      if (!stats || stats.count === 0) return null;
      return stats.sum / stats.count;
    });

    return { courseNames, students, courseAverages };
  }, [grades]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">
          {"\u062c\u0627\u0631\u0650 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062f\u0631\u062c\u0627\u062a..."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {"\u062c\u062f\u0648\u0644 \u062f\u0631\u062c\u0627\u062a \u0627\u0644\u0641\u0635\u0644"}
            </h1>
            <div className="text-sm text-gray-600">
              {classInfo?.name || "-"}
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            {"\u0631\u062c\u0648\u0639"}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {tableData.courseNames.length === 0 ? (
          <div className="bg-white rounded-lg border p-6 text-gray-600">
            {"\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0631\u062c\u0627\u062a \u0645\u0633\u062c\u0644\u0629 \u0628\u0639\u062f."}
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="min-w-full text-sm text-right">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="py-3 px-3 text-gray-600">
                    {"\u0627\u0644\u0637\u0627\u0644\u0628"}
                  </th>
                  {tableData.courseNames.map((course) => (
                    <th key={course} className="py-3 px-3 text-gray-600">
                      {course}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-gray-600">
                    {"\u0627\u0644\u0645\u062a\u0648\u0633\u0637"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableData.students.map((student) => (
                  <tr key={student.studentId} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium">{student.name}</td>
                    {student.courseAverages.map((avg, idx) => (
                      <td key={idx} className="py-2 px-3 text-gray-700">
                        {avg !== null ? `${avg.toFixed(1)}%` : "-"}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-gray-700">
                      {student.overallAvg !== null ? `${student.overallAvg.toFixed(1)}%` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50">
                  <td className="py-2 px-3 font-semibold text-gray-700">
                    {"\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0645\u0642\u0631\u0631"}
                  </td>
                  {tableData.courseAverages.map((avg, idx) => (
                    <td key={idx} className="py-2 px-3 text-gray-700">
                      {avg !== null ? `${avg.toFixed(1)}%` : "-"}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-gray-500">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
