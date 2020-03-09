(() => {
    
    function scrollToTop() {
        return new Promise((res, rej) => {
            let intervalCount = 0;
            let interval = setInterval(function() {
                console.log("scrolling up", intervalCount)
                
                const scrollElems = document.querySelectorAll(".tombstone-timestamp-split.ng-trigger.ng-trigger-incomingMessage.ng-tns-c25-3.ng-star-inserted")[0].scrollIntoView();
                
                intervalCount= intervalCount + 1;

                if(intervalCount > 5) {
                   clearInterval(interval);
                   res();
                }
             }, 1500);

        })
    }


    function getNumberCommaSanitizedString(str) {
        const numberCommaIndex = str.search(/\d,\d/);

        if (numberCommaIndex < 0) return str;

        const middlePoint = numberCommaIndex + 1;

        return `${str.substring(0, middlePoint)}${str.substring(middlePoint + 1, str.length)}`;
    }

    function getDateObjectFromText(dateText) {
        let [day, month, year] = dateText.split("/");

        return new Date(
            parseInt(`20${year}`),
            parseInt(month) - 1,
            parseInt(day)
        );
    }

    function getBills(smsList) {
        const bills = smsList.filter(s => s.includes("Your bill"));

        return bills.map(billText => {
            const minimumDue = parseInt(
                billText.match(/min due bdt (\d,?\d+);/i)[1].replace(",", "")
            );

            const dueAmount = billText.match(/total due bdt (\d+,?\d+);/i)[1].replace(",", "");

            const dueDate = billText.match(/please pay (by ?)(.+)\./i);

            const isUrgent = billText.includes("immediately");

            return {
                minimumDue,
                dueAmount,
                dueDate: dueDate ? getDateObjectFromText(dueDate[2]) : null,
                isUrgent
            }
        });
    }

    function getTransactions(smsList) {

        const transactionTexts = smsList.filter(s => s.includes("Trnx"));

        const transactions = transactionTexts.map(t => {
            const numberCommaSanitizedString = getNumberCommaSanitizedString(t);

            const [name, amountString, dateText] = numberCommaSanitizedString.split(",");

            const amount = amountString.match(/(BDT|USD)(\d+)/)[2];
            const dateString = dateText.match(/\d\d\/\d\d\/\d\d/)[0];
            const dateObject = getDateObjectFromText(dateString);

            return {
                name,
                amount: parseFloat(amount),
                date: dateObject
            }
        });

        return transactions;
    }

    function groupTransactionsByPeriod(transactions, periodDate = 18) {
        const groups = {};

        transactions.forEach(t => {
            const month = t.date.getMonth() + 1;
            const year = t.date.getFullYear();
            const day = t.date.getDate();

            let start_year = year;
            let end_year = year;
            let start_month = month;
            let end_month = month;
            
            if(day => periodDate) {
                if(month + 1 > 12) {
                    end_month = 1
                    end_year = year + 1
                } else {
                    end_month = month + 1
                }
            } else {
                if(month - 1 === 0) {
                    start_year-= 1;
                    start_month = 12
                } else {
                    end_month = 1
                }
            }
            start_month = `${start_month}`.padStart(2, 0);
            end_month = `${end_month}`.padStart(2, 0);

            const start_key = `${start_year}-${start_month}`;
            const end_key = `${end_year}-${end_month}`;
            const dateKey = `${start_key}_${end_key}`;

            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(t);
        });

        const monthlyGroups = Object.keys(groups).map((key) => {
            const [start, end] = key.split("_");
            return {
                startDate: `${start}-18`,
                endDate: `${end}-17`,
                transactions: groups[key],
                total: groups[key].reduce((sum, t) => sum + t.amount, 0)
            }
        })
        return monthlyGroups
            .sort((a,b) => new Date(b.startDate) - new Date(a.startDate))
    }

    function scrollToBottom() {
        const messages = [...document.querySelectorAll(".tombstone-timestamp-split.ng-trigger.ng-trigger-incomingMessage.ng-tns-c25-3.ng-star-inserted")]
        messages.pop().scrollIntoView()
    }

    function appendToView({
        monthlyTransactions
    }) {
        
        const nodeString = `<table style="padding: 10px">
            <thead>
                <tr>
                    <th style="padding: 10px">StartDate</th>
                    <th style="padding: 10px">EndDate</th>
                    <th style="padding: 10px">Total Amount</th>
                    <th style="padding: 10px">Number of transactions</th>
                </tr>
            </thead>
            <tbody>
                ${
                    monthlyTransactions.map(t => `
                        <tr>
                           <td style="padding: 10px">${t.startDate}</td>
                           <td style="padding: 10px">${t.endDate}</td>
                           <td style="padding: 10px">${t.total}</td>
                           <td style="padding: 10px">${t.transactions.length}</td>
                        </tr>
                    `).join("")
                }
            </tbody>
        </table>`

        const node = document.createElement("div")
        node.setAttribute("id", "myTable")
        node.innerHTML = nodeString
        
        const tableElement = document.querySelector(".compose-readonly") || document.querySelector('#myTable')
        tableElement.replaceWith(node)
        
    }

    async function run () {
        await scrollToTop()
        scrollToBottom()

        const textMessages = [...document.querySelectorAll(".text-msg")].map(r => r.innerText)
    
        const transactions = getTransactions(textMessages);

        const monthlyTransactions = groupTransactionsByPeriod(transactions);

        const averageExpense = (monthlyTransactions.reduce((sum, m) => sum + m.total, 0)) / monthlyTransactions.length;
        
        appendToView({
            monthlyTransactions,
            averageExpense
        })
                
        console.log(monthlyTransactions);
    }

    run()
})()
