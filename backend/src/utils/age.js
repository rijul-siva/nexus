'use strict';

const MIN_AGE = 10;
const MAX_AGE = 100;

const parseDateOnly = (value) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
    };
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [, yearText, monthText, dayText] = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return { year, month, day };
};

const calculateAge = (value, today = new Date()) => {
  const birthDate = parseDateOnly(value);
  if (!birthDate || !(today instanceof Date) || Number.isNaN(today.getTime())) return null;

  let age = today.getUTCFullYear() - birthDate.year;
  const birthdayHasNotOccurred =
    birthDate.month > today.getUTCMonth() + 1 ||
    (birthDate.month === today.getUTCMonth() + 1 && birthDate.day > today.getUTCDate());
  if (birthdayHasNotOccurred) age -= 1;
  return age;
};

const isValidDateOfBirth = (value, today = new Date()) => {
  const age = calculateAge(value, today);
  return age !== null && age >= MIN_AGE && age <= MAX_AGE;
};

module.exports = { calculateAge, isValidDateOfBirth, MIN_AGE, MAX_AGE };
