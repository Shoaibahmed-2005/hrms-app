import { recordManualCheckIn, recordManualCheckOut, fetchEmployees } from "./src/lib/hrms-db.js";

async function test() {
  try {
    console.log("Fetching employees...");
    const employees = await fetchEmployees();
    const emp = employees[0];
    console.log("Using employee:", emp.id, emp.name);

    console.log("Testing manual check-in...");
    const resIn = await recordManualCheckIn(emp.id, "manager-id");
    console.log("Check-In Response:", resIn);

    console.log("Testing manual check-out...");
    const resOut = await recordManualCheckOut(emp.id, "manager-id");
    console.log("Check-Out Response:", resOut);
  } catch (e) {
    console.error("Test Error:", e);
  }
}
test();
