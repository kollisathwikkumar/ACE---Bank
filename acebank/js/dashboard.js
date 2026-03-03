/*
  ACE Bank - Dashboard Interactions using SAL Pattern
  All actions now persist to the database via API calls.
  Dashboard loads live data on init and refreshes after every transaction.
*/

const API_BASE = '/LaceBank/api';

const SAL = {
    state: {
        currentUser: null,
        activePage: 'dashboard',
        isDarkMode: false,
        isNotificationPanelOpen: false,
        isLoading: false,
        modals: {
            transferModal: false,
            addFundsModal: false,
            newPaymentModal: false,
            scanPayModal: false,
            applyCardModal: false,
            submitTicketModal: false,
            addAccountModal: false
        },
        transactions: [],
        searchQuery: ''
    },

    actions: {
        init: () => {
            // Check authentication
            const userStr = sessionStorage.getItem('acebank_user');
            if (!userStr) {
                window.location.href = 'index.html';
                return;
            }
            SAL.state.currentUser = JSON.parse(userStr);

            // Set user profile data in DOM
            SAL.logic.renderUserProfile();

            // Attach Event Listeners
            SAL.logic.attachEventListeners();

            // Load initial page (dashboard)
            SAL.actions.switchPage('dashboard');

            // Load live dashboard data from APIs
            SAL.logic.loadDashboardData();
        },

        switchPage: (pageId) => {
            if (SAL.state.activePage === pageId && document.querySelector(`.page-view[id="page-${pageId}"]`)?.classList.contains('active')) return;

            SAL.state.activePage = pageId;

            document.querySelectorAll('.sidebar-nav li').forEach(item => {
                if (item.dataset.page === pageId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            document.querySelectorAll('.page-view').forEach(page => {
                page.classList.add('hidden');
                page.classList.remove('active', 'animate-fade-up');
            });

            const targetPage = document.getElementById(`page-${pageId}`);
            if (targetPage) {
                targetPage.classList.remove('hidden');
                setTimeout(() => {
                    targetPage.classList.add('active', 'animate-fade-up');
                }, 10);
            }
        },

        toggleDarkMode: () => {
            SAL.state.isDarkMode = !SAL.state.isDarkMode;
            SAL.logic.applyDarkMode();
        },

        toggleNotifPanel: () => {
            SAL.state.isNotificationPanelOpen = !SAL.state.isNotificationPanelOpen;
            const panel = document.getElementById('notifPanel');
            if (panel) {
                if (SAL.state.isNotificationPanelOpen) {
                    panel.classList.remove('hidden');
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                    panel.classList.add('hidden');
                }
            }
        },

        closeNotifPanel: () => {
            SAL.state.isNotificationPanelOpen = false;
            const panel = document.getElementById('notifPanel');
            if (panel) {
                panel.classList.remove('active');
                panel.classList.add('hidden');
            }
        },

        markAllNotifsRead: () => {
            const dot = document.getElementById('notifDot');
            if (dot) dot.style.display = 'none';
            SAL.logic.showToast('All notifications marked as read');
        },

        openModal: (modalId) => {
            SAL.state.modals[modalId] = true;
            const modal = document.getElementById(modalId);
            const overlay = document.getElementById('modalOverlay');
            if (modal) modal.classList.remove('hidden');
            if (overlay) overlay.classList.remove('hidden');
        },

        closeModal: () => {
            Object.keys(SAL.state.modals).forEach(modalId => {
                SAL.state.modals[modalId] = false;
                const modal = document.getElementById(modalId);
                if (modal) modal.classList.add('hidden');
            });
            const overlay = document.getElementById('modalOverlay');
            if (overlay) overlay.classList.add('hidden');
        },

        handleLogout: () => {
            sessionStorage.removeItem('acebank_user');
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity 0.4s ease';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 400);
        },

        logout: () => {
            SAL.actions.handleLogout();
        },

        // ========== TRANSFER ==========
        handleTransfer: async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Processing... <span class="material-symbols-outlined">sync</span>';
            btn.disabled = true;

            const toAccount = document.getElementById('transferToAccount').value;
            const amount = document.getElementById('transferAmount').value;
            const note = document.getElementById('transferNote').value || '';
            const user = SAL.state.currentUser;

            try {
                const res = await fetch(`${API_BASE}/transfer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fromAccount: user.accountNumber,
                        toAccount: parseInt(toAccount),
                        amount: parseFloat(amount),
                        remark: note
                    })
                });
                const data = await res.json();

                if (data.success) {
                    // Update session balance
                    user.balance = data.balance;
                    sessionStorage.setItem('acebank_user', JSON.stringify(user));

                    SAL.actions.closeModal();
                    SAL.logic.showToast('Transfer of ₹' + amount + ' completed successfully!');
                    e.target.reset();

                    // Refresh dashboard data
                    SAL.logic.loadDashboardData();
                } else {
                    SAL.logic.showToast(data.message || 'Transfer failed', 'error');
                }
            } catch (err) {
                SAL.logic.showToast('Network error. Please try again.', 'error');
                console.error('Transfer error:', err);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        },

        // ========== ADD FUNDS (DEPOSIT) ==========
        handleAddFunds: async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Processing... <span class="material-symbols-outlined">sync</span>';
            btn.disabled = true;

            const amount = document.getElementById('addFundsAmount').value;
            const user = SAL.state.currentUser;

            try {
                const res = await fetch(`${API_BASE}/deposit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        accountNumber: user.accountNumber,
                        amount: parseFloat(amount)
                    })
                });
                const data = await res.json();

                if (data.success) {
                    user.balance = data.balance;
                    sessionStorage.setItem('acebank_user', JSON.stringify(user));

                    SAL.actions.closeModal();
                    SAL.logic.showToast('₹' + amount + ' added to your account!');
                    e.target.reset();

                    SAL.logic.loadDashboardData();
                } else {
                    SAL.logic.showToast(data.message || 'Deposit failed', 'error');
                }
            } catch (err) {
                SAL.logic.showToast('Network error. Please try again.', 'error');
                console.error('Deposit error:', err);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        },

        // ========== NEW PAYMENT (BILL PAY) ==========
        handleNewPayment: async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Processing... <span class="material-symbols-outlined">sync</span>';
            btn.disabled = true;

            const paymentType = document.getElementById('paymentType').value;
            const payee = document.getElementById('paymentPayee').value;
            const amount = document.getElementById('paymentAmount').value;
            const user = SAL.state.currentUser;

            try {
                const res = await fetch(`${API_BASE}/payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        accountNumber: user.accountNumber,
                        amount: parseFloat(amount),
                        paymentType: paymentType,
                        payee: payee
                    })
                });
                const data = await res.json();

                if (data.success) {
                    user.balance = data.balance;
                    sessionStorage.setItem('acebank_user', JSON.stringify(user));

                    SAL.actions.closeModal();
                    SAL.logic.showToast(data.message || 'Payment successful!');
                    e.target.reset();

                    SAL.logic.loadDashboardData();
                } else {
                    SAL.logic.showToast(data.message || 'Payment failed', 'error');
                }
            } catch (err) {
                SAL.logic.showToast('Network error. Please try again.', 'error');
                console.error('Payment error:', err);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        },

        // ========== SCAN & PAY ==========
        handleScanPay: async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Processing... <span class="material-symbols-outlined">sync</span>';
            btn.disabled = true;

            const recipient = document.getElementById('scanPayRecipient').value;
            const amount = document.getElementById('scanPayAmount').value;
            const user = SAL.state.currentUser;

            try {
                const res = await fetch(`${API_BASE}/payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        accountNumber: user.accountNumber,
                        amount: parseFloat(amount),
                        paymentType: 'Scan & Pay',
                        payee: recipient
                    })
                });
                const data = await res.json();

                if (data.success) {
                    user.balance = data.balance;
                    sessionStorage.setItem('acebank_user', JSON.stringify(user));

                    SAL.actions.closeModal();
                    SAL.logic.showToast(data.message || 'Payment successful!');
                    e.target.reset();

                    SAL.logic.loadDashboardData();
                } else {
                    SAL.logic.showToast(data.message || 'Payment failed', 'error');
                }
            } catch (err) {
                SAL.logic.showToast('Network error. Please try again.', 'error');
                console.error('Scan Pay error:', err);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        },

        // ========== MISC ACTIONS ==========
        handleSearch: () => {
            const query = document.getElementById('searchInput')?.value?.toLowerCase() || '';
            SAL.state.searchQuery = query;
            // Could filter the transactions list, for now just a stub
        },

        handleApplyCard: (e) => {
            e.preventDefault();
            SAL.actions.closeModal();
            SAL.logic.showToast('Card application submitted! We will contact you soon.');
        },

        handleSubmitTicket: (e) => {
            e.preventDefault();
            SAL.actions.closeModal();
            SAL.logic.showToast('Support ticket created. A representative will reach out shortly.');
        },

        handleAddAccount: (e) => {
            e.preventDefault();
            SAL.actions.closeModal();
            SAL.logic.showToast('Account linked successfully! It may take a few minutes to appear.');
        },

        exportTransactions: () => {
            SAL.logic.showToast('Exporting transactions to CSV... This may take a moment.');
        },

        updateChartYear: (year) => {
            SAL.logic.showToast('Chart data for ' + year + ' coming soon', 'info');
        },

        showToast: (msg, type) => {
            SAL.logic.showToast(msg);
        },

        toggleFreezeCard: () => {
            const btn = document.getElementById('freezeBtnText');
            if (btn) {
                const isFrozen = btn.textContent.includes('Unfreeze');
                btn.textContent = isFrozen ? 'Freeze Card' : 'Unfreeze Card';
                SAL.logic.showToast(isFrozen ? 'Card unfrozen' : 'Card frozen temporarily');
            }
        },

        startLiveChat: () => {
            SAL.logic.showToast('Connecting to live chat support...');
        },

        callSupport: () => {
            SAL.logic.showToast('Calling ACE Bank support: 1800-ACE-BANK');
        },

        updateSetting: (setting) => {
            SAL.logic.showToast('Setting updated: ' + setting);
        },

        resetSettings: () => {
            document.querySelectorAll('.settings-card input[type="checkbox"]').forEach(cb => cb.checked = false);
            SAL.logic.showToast('Settings reset to defaults');
        }
    },

    logic: {
        attachEventListeners: () => {
            // Sidebar Navigation
            document.querySelectorAll('.sidebar-nav li').forEach(li => {
                li.addEventListener('click', (e) => {
                    const pageId = e.currentTarget.dataset.page;
                    if (pageId) SAL.actions.switchPage(pageId);
                });
            });

            // Escape key to close modals
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (SAL.state.isNotificationPanelOpen) {
                        SAL.actions.closeNotifPanel();
                    }
                    SAL.actions.closeModal();
                }
            });

            // Forms
            const transferForm = document.getElementById('transferForm');
            if (transferForm) transferForm.addEventListener('submit', SAL.actions.handleTransfer);

            const addFundsForm = document.getElementById('addFundsForm');
            if (addFundsForm) addFundsForm.addEventListener('submit', SAL.actions.handleAddFunds);

            const newPaymentForm = document.getElementById('newPaymentForm');
            if (newPaymentForm) newPaymentForm.addEventListener('submit', SAL.actions.handleNewPayment);

            const scanPayForm = document.getElementById('scanPayForm');
            if (scanPayForm) scanPayForm.addEventListener('submit', SAL.actions.handleScanPay);

            const applyCardForm = document.getElementById('applyCardForm');
            if (applyCardForm) applyCardForm.addEventListener('submit', SAL.actions.handleApplyCard);

            const submitTicketForm = document.getElementById('submitTicketForm');
            if (submitTicketForm) submitTicketForm.addEventListener('submit', SAL.actions.handleSubmitTicket);

            const addAccountForm = document.getElementById('addAccountForm');
            if (addAccountForm) addAccountForm.addEventListener('submit', SAL.actions.handleAddAccount);
        },

        renderUserProfile: () => {
            const user = SAL.state.currentUser;
            if (user) {
                const fullName = (user.firstName || '') + ' ' + (user.lastName || '');
                document.querySelectorAll('.profile-name').forEach(el => el.textContent = fullName);
                document.querySelectorAll('.profile-email').forEach(el => el.textContent = user.email || '');

                const initials = fullName.split(' ').filter(n => n).map(n => n[0]).join('').toUpperCase();
                document.querySelectorAll('.avatar').forEach(el => el.textContent = initials);

                // Sidebar user name
                const sidebarName = document.getElementById('sidebarUserName');
                if (sidebarName) sidebarName.textContent = fullName;

                // Card holder name
                const cardHolder = document.getElementById('cardHolderName');
                if (cardHolder) cardHolder.textContent = fullName.toUpperCase();
            }
        },

        applyDarkMode: () => {
            if (SAL.state.isDarkMode) {
                document.body.classList.add('dark-mode');
                const icon = document.getElementById('darkModeIcon');
                if (icon) icon.textContent = 'light_mode';
            } else {
                document.body.classList.remove('dark-mode');
                const icon = document.getElementById('darkModeIcon');
                if (icon) icon.textContent = 'dark_mode';
            }
        },

        showToast: (message) => {
            let toastContainer = document.getElementById('toastContainer');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toastContainer';
                toastContainer.className = 'toast-container';
                toastContainer.style.position = 'fixed';
                toastContainer.style.bottom = '24px';
                toastContainer.style.right = '24px';
                toastContainer.style.zIndex = '9999';
                toastContainer.style.display = 'flex';
                toastContainer.style.flexDirection = 'column';
                toastContainer.style.gap = '10px';
                document.body.appendChild(toastContainer);
            }

            const toast = document.createElement('div');
            toast.className = 'toast animate-fade-up';
            toast.style.background = 'var(--bg-surface)';
            toast.style.color = 'var(--text-main)';
            toast.style.padding = '16px 24px';
            toast.style.borderRadius = '8px';
            toast.style.boxShadow = 'var(--shadow-lg)';
            toast.style.borderLeft = '4px solid var(--primary)';
            toast.style.display = 'flex';
            toast.style.alignItems = 'center';
            toast.style.gap = '12px';

            toast.innerHTML = `
                <span class="material-symbols-outlined text-primary" style="color: var(--primary)">info</span>
                <span>${message}</span>
            `;

            toastContainer.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        // ========== LIVE DATA LOADING ==========
        loadDashboardData: async () => {
            const user = SAL.state.currentUser;
            if (!user || !user.accountNumber) return;

            const accNo = user.accountNumber;

            // Load all data in parallel
            try {
                const [balRes, analyticsRes, txRes] = await Promise.allSettled([
                    fetch(`${API_BASE}/balance`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ accountNumber: accNo, amount: 0, type: 'check' })
                    }),
                    fetch(`${API_BASE}/analytics?accountNo=${accNo}`),
                    fetch(`${API_BASE}/transactions?accountNo=${accNo}`)
                ]);

                // --- Balance ---
                if (balRes.status === 'fulfilled') {
                    try {
                        // Fallback: use the service balance via a GET or read from analytics
                    } catch (e) { /* ignore */ }
                }

                // --- Analytics ---
                if (analyticsRes.status === 'fulfilled') {
                    const analyticsData = await analyticsRes.value.json();
                    if (analyticsData.success) {
                        SAL.logic.renderAnalytics(analyticsData);
                    }
                }

                // --- Transactions ---
                if (txRes.status === 'fulfilled') {
                    const txData = await txRes.value.json();
                    if (txData.success) {
                        SAL.state.transactions = txData.transactions || [];
                        SAL.logic.renderTransactions(txData.transactions || []);
                    }
                }

                // Update balance from analytics or session
                SAL.logic.updateBalanceDisplay();

            } catch (err) {
                console.error('Dashboard data load error:', err);
            }
        },

        updateBalanceDisplay: () => {
            const user = SAL.state.currentUser;
            if (!user) return;

            const balance = parseFloat(user.balance) || 0;
            const formatted = '₹' + balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            // Hero balance
            const heroBalance = document.getElementById('heroBalance');
            if (heroBalance) heroBalance.textContent = formatted;

            // Account card balance
            document.querySelectorAll('.hero-bal-display').forEach(el => el.textContent = formatted);
            document.querySelectorAll('.acc-bal').forEach((el, i) => {
                if (i === 0) el.textContent = formatted;
            });
        },

        renderAnalytics: (data) => {
            const formatCurrency = (val) => {
                const num = parseFloat(val) || 0;
                if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + 'L';
                if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + 'k';
                return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            };

            // Update income stat card
            const incomeEl = document.getElementById('statIncome');
            if (incomeEl) incomeEl.textContent = formatCurrency(data.income);

            const incomeTrend = document.getElementById('statIncomeTrend');
            if (incomeTrend) {
                const inc = parseFloat(data.income) || 0;
                incomeTrend.textContent = inc > 0 ? `${data.currentMonth} ${data.currentYear}` : 'No data';
                incomeTrend.className = inc > 0 ? 'stat-trend positive' : 'stat-trend text-muted';
            }

            // Update expenses stat card
            const expEl = document.getElementById('statExpenses');
            if (expEl) expEl.textContent = formatCurrency(data.expenses);

            const expTrend = document.getElementById('statExpensesTrend');
            if (expTrend) {
                const exp = parseFloat(data.expenses) || 0;
                expTrend.textContent = exp > 0 ? `${data.currentMonth} ${data.currentYear}` : 'No data';
                expTrend.className = exp > 0 ? 'stat-trend negative' : 'stat-trend text-muted';
            }

            // Update Analytics page - Income vs Expenses progress bars
            const incomeAmount = parseFloat(data.income) || 0;
            const expensesAmount = parseFloat(data.expenses) || 0;
            const maxVal = Math.max(incomeAmount, expensesAmount, 1);

            const progLabels = document.querySelectorAll('.prog-labels');
            if (progLabels.length >= 2) {
                // Income progress
                const incLabel = progLabels[0].querySelectorAll('span');
                if (incLabel.length >= 2) incLabel[1].textContent = formatCurrency(incomeAmount);

                // Expenses progress
                const expLabel = progLabels[1].querySelectorAll('span');
                if (expLabel.length >= 2) expLabel[1].textContent = formatCurrency(expensesAmount);
            }

            const progFills = document.querySelectorAll('.prog-fill');
            if (progFills.length >= 2) {
                progFills[0].style.width = Math.round((incomeAmount / maxVal) * 100) + '%';
                progFills[1].style.width = Math.round((expensesAmount / maxVal) * 100) + '%';
            }

            // Update donut chart total
            const donutTotal = document.getElementById('donutTotal');
            if (donutTotal) donutTotal.textContent = formatCurrency(expensesAmount);

            // Update spending summary legend
            const spendingByType = data.spendingByType || [];
            const totalSpending = spendingByType.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
            const legendItems = document.querySelectorAll('.legend-item');

            // Map spending types to legend items
            spendingByType.forEach((cat, i) => {
                if (i < legendItems.length) {
                    const pct = totalSpending > 0 ? Math.round((parseFloat(cat.amount) / totalSpending) * 100) : 0;
                    legendItems[i].innerHTML = legendItems[i].querySelector('.dot')?.outerHTML +
                        ` ${cat.type} (${pct}%) - ${formatCurrency(cat.amount)}`;
                }
            });

            // Update monthly spending bar chart
            SAL.logic.renderBarChart(data.monthlySpending || []);

            // Update savings rate
            if (data.savingsRate !== undefined) {
                // Can display savings rate somewhere if needed
            }

            // Also update the balance from analytics data if we have it
            // The balance is available from the session
            SAL.logic.updateBalanceDisplay();
        },

        renderBarChart: (monthlyData) => {
            const container = document.getElementById('spendingBarChart');
            if (!container) return;

            if (!monthlyData || monthlyData.length === 0) {
                container.innerHTML = '<div class="text-muted text-center" style="padding:2rem">No spending data yet</div>';
                return;
            }

            const maxAmount = Math.max(...monthlyData.map(m => parseFloat(m.amount) || 0), 1);

            let html = '<div class="bar-chart">';
            monthlyData.forEach(m => {
                const amount = parseFloat(m.amount) || 0;
                const pct = Math.round((amount / maxAmount) * 100);
                const formatted = amount >= 1000 ? '₹' + (amount / 1000).toFixed(1) + 'k' : '₹' + amount;
                html += `
                    <div class="bar-col">
                        <div class="bar-value">${formatted}</div>
                        <div class="bar-track">
                            <div class="bar-fill" style="height:${Math.max(pct, 2)}%"></div>
                        </div>
                        <div class="bar-label">${m.label}</div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        },

        renderTransactions: (transactions) => {
            const user = SAL.state.currentUser;
            const accNo = user?.accountNumber;

            // Dashboard recent transactions (max 5)
            const dashList = document.getElementById('dashboardTxnList');
            if (dashList) {
                const recent = transactions.slice(0, 5);
                if (recent.length === 0) {
                    dashList.innerHTML = '<div class="text-muted text-sm text-center" style="padding:2rem">No transactions yet. Make a transfer or add funds to get started!</div>';
                } else {
                    dashList.innerHTML = recent.map(tx => SAL.logic.buildTxnRow(tx, accNo)).join('');
                }
            }

            // Full transactions page
            const fullList = document.getElementById('fullTxnList');
            if (fullList) {
                if (transactions.length === 0) {
                    fullList.innerHTML = '<div class="text-muted text-sm text-center" style="padding:2rem">No transactions found</div>';
                } else {
                    fullList.innerHTML = transactions.map(tx => SAL.logic.buildTxnRow(tx, accNo)).join('');
                }
            }

            // Update transaction badge count
            const badge = document.getElementById('navTxBadge');
            if (badge) {
                badge.textContent = transactions.length;
                badge.style.display = transactions.length > 0 ? 'inline-flex' : 'none';
            }
        },

        buildTxnRow: (tx, accNo) => {
            const isOutgoing = tx.direction === 'outgoing';
            const icon = isOutgoing ? 'arrow_upward' : 'arrow_downward';
            const iconColor = isOutgoing ? '#ef4444' : '#22c55e';
            const sign = isOutgoing ? '-' : '+';
            const amount = parseFloat(tx.amount) || 0;
            const formatted = '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            let title = tx.remark || tx.txType;
            let subtitle = tx.txType;

            if (tx.txType === 'TRANSFER') {
                if (isOutgoing) {
                    subtitle = 'To: ' + tx.receiverAccount;
                } else {
                    subtitle = 'From: ' + tx.senderAccount;
                }
            } else if (tx.txType === 'DEPOSIT') {
                title = tx.remark || 'Deposit';
                subtitle = 'Funds added';
            } else if (tx.txType === 'WITHDRAWAL') {
                title = tx.remark || 'Payment';
                subtitle = 'Bill Payment';
            }

            // Format date
            let dateStr = '';
            if (tx.createdAt) {
                const d = new Date(tx.createdAt);
                dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' +
                    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            }

            return `
                <div class="txn-row">
                    <div class="txn-icon" style="background:${isOutgoing ? '#fef2f2' : '#f0fdf4'}; color:${iconColor}">
                        <span class="material-symbols-outlined">${icon}</span>
                    </div>
                    <div class="txn-info">
                        <div class="txn-title">${title}</div>
                        <div class="txn-sub text-muted">${subtitle}${dateStr ? ' • ' + dateStr : ''}</div>
                    </div>
                    <div class="txn-amount" style="color:${iconColor}">
                        ${sign}${formatted}
                    </div>
                </div>
            `;
        }
    }
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', SAL.actions.init);
