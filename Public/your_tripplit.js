function showCustomDialog(message, buttons) {
    return new Promise((resolve) => {
        const dialogOverlay = document.getElementById("custom-dialog-overlay");
        const dialogMessage = document.getElementById("dialog-message");
        const dialogButtonsContainer = document.getElementById("dialog-buttons");
        
        dialogMessage.textContent = message;
        dialogButtonsContainer.innerHTML = '';
        
        buttons.forEach(btnConfig => {
            const button = document.createElement("button");
            button.textContent = btnConfig.text;
            button.className = btnConfig.className;
            button.addEventListener("click", () => {
                dialogOverlay.classList.add("hidden");
                // Re-enable body scroll
                document.body.style.overflow = '';
                document.body.style.position = '';
                resolve(btnConfig.value);
            });
            dialogButtonsContainer.appendChild(button);
        });
        
        // Prevent body scroll to lock the background
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        
        // Show the dialog
        dialogOverlay.classList.remove("hidden");
        
        // Force immediate visibility and focus
        requestAnimationFrame(() => {
            // Ensure dialog is visible
            dialogOverlay.style.display = 'flex';
            
            // Focus first button for accessibility
            const firstButton = dialogButtonsContainer.querySelector("button");
            if (firstButton) {
                setTimeout(() => firstButton.focus(), 100);
            }
        });
    });
}

// Add this helper function to your code
function preventBodyScroll() {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    return scrollY;
}

function restoreBodyScroll(scrollY) {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, scrollY);
}

import { dbPromise } from './firebase-config.js';
import {
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    onSnapshot,
    runTransaction,
    addDoc,
    collection
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const db = await dbPromise;

const params = new URLSearchParams(window.location.search);
const tripId = params.get("id");
const tripRef = doc(db, "trips", tripId);

const tripNameElem = document.getElementById("trip-name");
const tripIdElem = document.getElementById("trip-id");
const participantListElem = document.getElementById("participant-list");
const participantForm = document.getElementById("participant-form");
const participantInput = document.getElementById("participant-name");

const expenseForm = document.getElementById("expense-form");
const expenseCategoryInput = document.getElementById("expense-category");
const expenseAmountInput = document.getElementById("expense-amount");
const expensePaidBySelect = document.getElementById("expense-paid-by");
const expenseListContainer = document.getElementById("expense-list");
const expenseItems = document.getElementById("expense-items");
const loader = document.getElementById("loader");


let currentTrip = null;

// 🔹 Helper: Generate unique ID for each expense
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// -------------------------------------------------------------
// MAIN REAL-TIME LISTENER
// -------------------------------------------------------------
onSnapshot(tripRef, (docSnap) => {
    if (!docSnap.exists()) return;

    const tripData = docSnap.data();
    const participants = tripData.participants || [];
    const expenses = tripData.expenses || [];

    renderParticipants(participants, expenses);
    renderExpenses(expenses); // ✅ UPDATED: This now filters settlements
    updatePaidByOptions(participants);

    // 🔢 New function
    calculateBalances(participants, expenses);
    renderSettlementHistory(expenses)

    tripNameElem.textContent = tripData.name;
    tripIdElem.textContent = `Trip ID: ${tripId}`;

    const hasParticipants = participants.length > 0;
    expenseForm.style.display = hasParticipants ? "flex" : "none";
    expenseListContainer.style.display = hasParticipants ? "block" : "none";
});

// -------------------------------------------------------------
// PARTICIPANT FORM LOGIC
// -------------------------------------------------------------
participantForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = participantInput.value.trim();
    if (!name) return;

    try {
        await updateDoc(tripRef, {
            participants: arrayUnion(name),
        });
        participantInput.value = "";
    } catch (err) {
        console.error("Error adding participant:", err);
    }
});

participantInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        participantForm.dispatchEvent(new Event("submit"));
    }
});

function renderParticipants(participants, expenses = []) {
    if (!participants.length) {
        participantListElem.innerHTML = "<p>No participants yet. Add some!</p>";
        return;
    }

    participantListElem.innerHTML = "<ul></ul>";
    const ul = participantListElem.querySelector("ul");

    participants.forEach(name => {
        const li = document.createElement("li");

        const userSpan = document.createElement("span");
        userSpan.innerHTML = `<i class="fas fa-user"></i> ${name}`;

        const deleteBtn = document.createElement("i");
        deleteBtn.className = "fas fa-trash";
        deleteBtn.title = "Remove";

        deleteBtn.addEventListener("click", async () => {
            try {
                const usedInExpense = expenses.some(exp => exp.paidBy === name);
                if (usedInExpense) {
                    const confirmed = await showCustomDialog(
                        `⚠️ "${name}" has paid for some expenses. Deleting them may cause data inconsistency. Do you want to continue?`,
                        [
                            { text: "Cancel", className: "secondary", value: false },
                            { text: "Continue", className: "primary", value: true }
                        ]
                    );
                    
                    if (!confirmed) {
                        return;
                    }
                }

                // ✅ The updateDoc logic remains the same
                await updateDoc(tripRef, {
                    participants: arrayRemove(name),
                });

            } catch (err) {
                console.error("Error removing participant:", err);
                // ✅ REPLACED: Native alert() with custom dialog
                showCustomDialog(
                    "Error removing participant. Please try again.",
                    [{ text: "OK", className: "secondary", value: true }]
                );
            }
        });

        li.appendChild(userSpan);
        li.appendChild(deleteBtn);
        ul.appendChild(li);
    });
}
function updatePaidByOptions(participants) {
    expensePaidBySelect.innerHTML = "";
    participants.forEach(p => {
        const option = document.createElement("option");
        option.value = p;
        option.textContent = p;
        expensePaidBySelect.appendChild(option);
    });
}

// -------------------------------------------------------------
// EXPENSE FORM LOGIC
// -------------------------------------------------------------
expenseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const category = expenseCategoryInput.value.trim();
    const amount = parseFloat(expenseAmountInput.value.trim());
    const paidBy = expensePaidBySelect.value;

    if (!category || isNaN(amount) || !paidBy) {
        alert("Please fill all fields correctly.");
        return;
    }

    const newExpense = {
        id: generateId(),
        category,
        amount,
        paidBy,
        timestamp: Date.now(),
        isSettlement: false, // ✅ NEW: added a flag for non-settlement expenses
    };

    try {
        await updateDoc(tripRef, {
            expenses: arrayUnion(newExpense),
        });

        expenseCategoryInput.value = "";
        expenseAmountInput.value = "";
    } catch (err) {
        console.error("Error adding expense:", err);
    }
});

function renderExpenses(expenses) {
    const expenseItemsDiv = document.getElementById("expense-items");
    expenseItemsDiv.innerHTML = "";

    // ✅ UPDATED: Filter out settlement transactions
    const nonSettlementExpenses = expenses.filter(exp => !exp.isSettlement);

    if (!nonSettlementExpenses || nonSettlementExpenses.length === 0) {
        expenseItemsDiv.innerHTML = "<p>No expenses added yet.</p>";
        return;
    }

    nonSettlementExpenses.forEach(exp => {
        const item = document.createElement("div");
        item.className = "expense-item";

        const details = document.createElement("div");
        details.className = "expense-details";
        details.innerHTML = `
      <div class="expense-summary">${exp.category} - ₹${exp.amount}</div>
      <div class="expense-meta">Paid by: ${exp.paidBy}</div>
    `;

        const actions = document.createElement("div");

        const editIcon = document.createElement("i");
        editIcon.className = "fas fa-edit";
        editIcon.title = "Edit amount";
        editIcon.addEventListener("click", () =>
            editExpenseAmount(exp.id, tripId, exp.amount)
        );

        const deleteIcon = document.createElement("i");
        deleteIcon.className = "fas fa-trash";
        deleteIcon.title = "Delete expense";
        deleteIcon.addEventListener("click", () =>
            deleteExpense(exp.id, tripId)
        );

        actions.appendChild(editIcon);
        actions.appendChild(deleteIcon);

        item.appendChild(details);
        item.appendChild(actions);
        expenseItemsDiv.appendChild(item);
    });
}

// -------------------------------------------------------------
// EXPENSE EDIT & DELETE LOGIC
// -------------------------------------------------------------
// This is your corrected deleteExpense function
async function deleteExpense(expenseId, tripId) {
    const tripRef = doc(db, "trips", tripId);
    try {
        await runTransaction(db, async (transaction) => {
            const tripSnap = await transaction.get(tripRef);
            if (!tripSnap.exists()) throw new Error("Trip not found");
            const tripData = tripSnap.data();

            // ✅ CORRECTED LOGIC: Filter out the expense to be deleted AND all settlements
            const updatedExpenses = (tripData.expenses || [])
                .filter(exp => exp.id !== expenseId && !exp.isSettlement);
            
            transaction.update(tripRef, {
                expenses: updatedExpenses,
                isFullySettled: false // Resetting the flag
            });
        });
    } catch (err) {
        console.error("Failed to delete expense (transaction):", err);
    }
}
// This is your corrected editExpenseAmount function
async function editExpenseAmount(expenseId, tripId, currentAmount) {
    const newAmount = prompt("Enter new amount:", currentAmount);
    if (newAmount === null || isNaN(parseFloat(newAmount))) return;
    const parsedAmount = parseFloat(newAmount);
    const tripRef = doc(db, "trips", tripId);
    try {
        await runTransaction(db, async (transaction) => {
            const tripSnap = await transaction.get(tripRef);
            if (!tripSnap.exists()) throw new Error("Trip not found");
            const tripData = tripSnap.data();
            
            // ✅ CORRECTED LOGIC: Create a new array without settlements
            let updatedExpenses = (tripData.expenses || []).filter(exp => !exp.isSettlement);

            // Now, map over the new array to update the specific expense
            updatedExpenses = updatedExpenses.map(exp =>
                exp.id === expenseId ? { ...exp, amount: parsedAmount } : exp
            );
            
            transaction.update(tripRef, {
                expenses: updatedExpenses,
                isFullySettled: false // Resetting the flag
            });
        });
    } catch (err) {
        console.error("Failed to update expense amount (transaction):", err);
    }
}// -------------------------------------------------------------
// BALANCE CALCULATION & RENDERING
// -------------------------------------------------------------
function renderBalanceSummary(netBalances, settlements) {
    const balanceSummaryDiv = document.getElementById("balance-summary");
    balanceSummaryDiv.innerHTML = "";

    // 👥 Net Balances
    netBalances.forEach((balance, name) => {
        const item = document.createElement("div");
        item.className = "balance-item";
        const label = document.createElement("div");
        label.textContent = `${name}:`;
        const value = document.createElement("div");
        value.textContent = balance >= 0 ?
            `Gets ₹${balance.toFixed(2)}` :
            `Owes ₹${Math.abs(balance).toFixed(2)}`;
        value.style.color = balance >= 0 ? "#10b981" : "#ef4444";
        item.appendChild(label);
        item.appendChild(value);
        balanceSummaryDiv.appendChild(item);
    });

    // 🔄 Settlement List
    if (settlements.length > 0) {
        const header = document.createElement("h4");
        header.textContent = "Settlement Summary:";
        header.style.marginTop = "1rem";
        balanceSummaryDiv.appendChild(header);

        // A container for all settlement items
        const settlementListUl = document.createElement("ul");
        settlementListUl.id = "settlement-list"; // Give it an ID to attach a listener
        balanceSummaryDiv.appendChild(settlementListUl);
        
        settlements.forEach(s => {
            const listItem = document.createElement("li");
            listItem.className = "settlement-item";
            const row = document.createElement("div");
            row.className = "balance-item";
            const label = document.createElement("div");
            label.textContent = `${s.from} owes ${s.to}`;
            const amount = document.createElement("div");
            amount.textContent = `₹${s.amount.toFixed(2)}`;
            amount.style.fontWeight = "600";
            const settleBtn = document.createElement("button");
            settleBtn.textContent = "Settle";
            settleBtn.className = "settle-btn";
            settleBtn.setAttribute("data-from", s.from);
            settleBtn.setAttribute("data-to", s.to);
            settleBtn.setAttribute("data-amount", s.amount);
            row.appendChild(label);
            row.appendChild(amount);
            row.appendChild(settleBtn);
            listItem.appendChild(row);
            settlementListUl.appendChild(listItem);
        });
    }
}

// This is your new, final calculateBalances function
function calculateBalances(participants, expenses, isLocalCheck = false) { // isLocalCheck added to prevent infinite loop
    
    // ✅ NEW: Check the isFullySettled flag first
    if (!isLocalCheck && currentTrip && currentTrip.isFullySettled) {
        renderBalanceSummary(new Map(), []);
        return; // Exit early if the trip is settled
    }

    const paymentMap = new Map();
    let totalOriginalExpense = 0;

    participants.forEach(name => paymentMap.set(name, 0));

    const settlements = [];
    const originalExpenses = [];
    expenses.forEach(exp => {
        if (exp.isSettlement) {
            settlements.push(exp);
        } else {
            originalExpenses.push(exp);
            if (paymentMap.has(exp.paidBy)) {
                paymentMap.set(exp.paidBy, paymentMap.get(exp.paidBy) + exp.amount);
                totalOriginalExpense += exp.amount;
            }
        }
    });

    const perPersonShare = participants.length > 0 ? totalOriginalExpense / participants.length : 0;
    const netBalances = new Map();
    const finalBalancesArray = [];

    participants.forEach(name => {
        const paid = paymentMap.get(name);
        const balance = paid - perPersonShare;
        netBalances.set(name, balance);
        finalBalancesArray.push(balance);
    });

    settlements.forEach(settlement => {
        const payerBalance = netBalances.get(settlement.paidBy);
        const recipientBalance = netBalances.get(settlement.settles);
        netBalances.set(settlement.paidBy, payerBalance + settlement.amount);
        netBalances.set(settlement.settles, recipientBalance - settlement.amount);
    });

    if (isLocalCheck) {
        return finalBalancesArray; // Return the balances for the local check
    }

    const debtors = [];
    const creditors = [];

    netBalances.forEach((amount, name) => {
        if (amount < -0.01) {
            debtors.push({ name, amount: Math.abs(amount) });
        } else if (amount > 0.01) {
            creditors.push({ name, amount });
        }
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const finalSettlements = [];

    while (debtors.length && creditors.length) {
        const debtor = debtors[0];
        const creditor = creditors[0];
        const settleAmount = Math.min(debtor.amount, creditor.amount);
        finalSettlements.push({
            from: debtor.name,
            to: creditor.name,
            amount: settleAmount
        });
        debtor.amount -= settleAmount;
        creditor.amount -= settleAmount;
        if (Math.abs(debtor.amount) < 0.01) debtors.shift();
        if (Math.abs(creditor.amount) < 0.01) creditors.shift();
    }
    
    renderBalanceSummary(netBalances, finalSettlements);
}
// -------------------------------------------------------------
// SETTLEMENT BUTTON EVENT LISTENER
// -------------------------------------------------------------
// This replaces the old event listener for the "Settle" button
document.getElementById("balance-summary").addEventListener("click", async (e) => {
    if (e.target.classList.contains("settle-btn")) {
        const from = e.target.getAttribute("data-from");
        const to = e.target.getAttribute("data-to");
        const amount = parseFloat(e.target.getAttribute("data-amount"));

        const confirm1 = await showCustomDialog(`Confirm that ${from} has paid ${to} ₹${amount.toFixed(2)}?`,
            [
                            { text: "Cancel", className: "secondary", value: false },
                            { text: "Continue", className: "primary", value: true }
                        ]);
        if (!confirm1) return;

        const confirm2 = await showCustomDialog(`❌ This is a final warning. Click OK to confirm the payment from ${from} to ${to} for ₹${amount.toFixed(2)}`,

           [
                            { text: "Cancel", className: "secondary", value: false },
                            { text: "Ok", className: "primary", value: true }
                        ]);
        if (!confirm2) {
            alert("Settlement cancelled.");
            return;
        }

        try {
            await runTransaction(db, async (transaction) => {
                const tripSnap = await transaction.get(tripRef);
                if (!tripSnap.exists()) throw "Trip does not exist!";
                const tripData = tripSnap.data();
                const expenses = tripData.expenses || [];

                const newSettlement = {
                    id: generateId(),
                    category: `Settlement from ${from}`,
                    amount: amount,
                    paidBy: from,
                    settles: to,
                    isSettlement: true,
                    timestamp: Date.now()
                };

                const updatedExpenses = [...expenses, newSettlement];
                
                // Re-run balance calculation locally to check if all debts are cleared
                const tempBalances = calculateBalances(tripData.participants, updatedExpenses, true);
                const isAllSquare = tempBalances.every(b => Math.abs(b) < 0.01);
                
                transaction.update(tripRef, {
                    expenses: updatedExpenses,
                    isFullySettled: isAllSquare // ✅ NEW: Set the settlement flag
                });
            });
            showCustomDialog(
                `Settlement of ₹${amount.toFixed(2)} from ${from} to ${to} recorded.`,
                [{ text: "OK", className: "secondary", value: true }]
            );

        } catch (err) {
            console.error("Error recording settlement:", err);
showCustomDialog(
                "Failed to record settlement. Try again.",
                [{ text: "OK", className: "secondary", value: true }]
            );        }
    }
});
// This function needs to be added to your JavaScript file
function renderSettlementHistory(expenses) {
    const historyListDiv = document.getElementById("settlement-history-list");
    historyListDiv.innerHTML = ""; // Clear existing records

    // Filter for only settlement transactions
    const settlementRecords = expenses.filter(exp => exp.isSettlement);

    if (settlementRecords.length === 0) {
        historyListDiv.innerHTML = "<p>No settlement records yet.</p>";
        return;
    }

    const ul = document.createElement("ul");
    settlementRecords.forEach(record => {
        const li = document.createElement("li");
        li.className = "settlement-record-item";

        // Create a user-friendly timestamp
        const date = new Date(record.timestamp).toLocaleDateString();

        // Create the display text
        li.innerHTML = `
            <span class="settlement-details">
                ${record.paidBy} settled ₹${record.amount.toFixed(2)} with ${record.settles}.
            </span>
            <span class="settlement-date">
                (on ${date})
            </span>
        `;
        ul.appendChild(li);
    });

    historyListDiv.appendChild(ul);
}
// This function needs to be added to your JavaScript file
// This is a new function, so it's best to place it with your other event listeners

// This is your updated event listener for the Clear All button
// This is your updated event listener for the Clear All button
document.getElementById("clear-all-btn").addEventListener("click", async () => {
    // Replaced the first native confirm() with our custom dialog
    const confirmed1 = await showCustomDialog(
        "⚠️ Are you sure you want to clear ALL expenses and settlements?",
        [
            { text: "Cancel", className: "secondary", value: false },
            { text: "Continue", className: "primary", value: true }
        ]
    );

    if (!confirmed1) {
        return;
    }

    // Replaced the second native confirm() with our custom dialog
    const confirmed2 = await showCustomDialog(
        "❌ This will PERMANENTLY erase all trip data. Are you absolutely sure?",
        [
            { text: "No", className: "secondary", value: false },
            { text: "Yes, clear data", className: "primary", value: true }
        ]
    );

    if (!confirmed2) {
        return;
    }

    // Perform the database update after both custom confirmations
    try {
        await updateDoc(tripRef, {
            expenses: [],
            isFullySettled: false,
        });
        // We can even use our custom dialog for the final alert!
        showCustomDialog(
            "All expenses and settlements have been cleared.",
            [{ text: "OK", className: "secondary", value: true }]
        );
    } catch (err) {
        console.error("Error clearing all data:", err);
        showCustomDialog(
            "Failed to clear all data. Please try again.",
            [{ text: "OK", className: "secondary", value: true }]
        );
    }finally{
            loader.style.display = "none";
    }
});