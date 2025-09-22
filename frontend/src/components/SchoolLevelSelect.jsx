import React from 'react';
import { AiOutlineExclamationCircle } from 'react-icons/ai';

const SchoolLevelSelect = ({
  name = "school_level",
  value,
  onChange,
  error,
  placeholder = "اختر المرحلة الدراسية",
  className = "",
  required = false
}) => {
  // Unified Arabic format for all components
  const schoolLevels = [
    "لم يدخل المدرسة",
        "روضة",
    "الأول الابتدائي",
    "الثاني الابتدائي",
    "الثالث الابتدائي",
    "الرابع الابتدائي",
    "الخامس الابتدائي",
    "السادس الابتدائي",
    "الأول متوسط",
    "الثاني متوسط",
    "الثالث متوسط",
    "الأول ثانوي",
    "الثاني ثانوي",
    "الثالث ثانوي",
    "جامعة",
    "خريج",
    "دراسات عليا",
    "موظف",
    "غير محدد"
  ];

  const baseClassName = `mt-4 p-3 w-full border rounded-lg focus:border-accent focus:outline-none transition-colors bg-white ${
    error ? "border-[var(--color-error-500)]" : "border-light"
  }`;

  return (
    <div className={className}>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={baseClassName}
        required={required}
      >
        <option value="">{placeholder}</option>
        {schoolLevels.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
      {error && (
        <div className="flex items-center mt-1 text-[var(--color-error-600)] text-sm">
          <AiOutlineExclamationCircle className="ml-1" />
          {error}
        </div>
      )}
    </div>
  );
};

export default SchoolLevelSelect;