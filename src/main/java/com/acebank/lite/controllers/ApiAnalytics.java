package com.acebank.lite.controllers;

import com.acebank.lite.util.ConnectionManager;
import com.acebank.lite.util.QueryLoader;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.java.Log;

import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Log
@WebServlet("/api/analytics")
public class ApiAnalytics extends HttpServlet {

    private final Gson gson = new Gson();

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setCorsHeaders(resp);
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setCorsHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();
        JsonObject response = new JsonObject();

        try {
            String accParam = req.getParameter("accountNo");
            if (accParam == null || accParam.isEmpty()) {
                response.addProperty("success", false);
                response.addProperty("message", "accountNo parameter is required");
                out.print(gson.toJson(response));
                return;
            }

            int accountNo = Integer.parseInt(accParam);
            Connection conn = ConnectionManager.getConnection();

            // 1. Monthly Spending (last 6 months)
            Map<String, BigDecimal> monthlyMap = new LinkedHashMap<>();
            Map<String, String> monthLabels = new LinkedHashMap<>();

            // Pre-fill last 6 months with 0
            LocalDate now = LocalDate.now();
            for (int i = 5; i >= 0; i--) {
                LocalDate m = now.minusMonths(i);
                String key = String.format("%d-%02d", m.getYear(), m.getMonthValue());
                String label = m.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
                monthlyMap.put(key, BigDecimal.ZERO);
                monthLabels.put(key, label);
            }

            String monthlySQL = QueryLoader.get("analytics.monthly_spending");
            try (PreparedStatement ps = conn.prepareStatement(monthlySQL)) {
                ps.setInt(1, accountNo);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        String monthKey = rs.getString("MONTH_KEY");
                        BigDecimal total = rs.getBigDecimal("TOTAL");
                        if (monthlyMap.containsKey(monthKey)) {
                            monthlyMap.put(monthKey, total);
                        }
                    }
                }
            }

            JsonArray monthlyData = new JsonArray();
            for (Map.Entry<String, BigDecimal> entry : monthlyMap.entrySet()) {
                JsonObject m = new JsonObject();
                m.addProperty("key", entry.getKey());
                m.addProperty("label", monthLabels.get(entry.getKey()));
                m.addProperty("amount", entry.getValue());
                monthlyData.add(m);
            }

            // 2. Current Month Income
            BigDecimal income = BigDecimal.ZERO;
            String incomeSQL = QueryLoader.get("analytics.current_month_income");
            try (PreparedStatement ps = conn.prepareStatement(incomeSQL)) {
                ps.setInt(1, accountNo);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next())
                        income = rs.getBigDecimal("TOTAL");
                }
            }

            // Also add deposits where sender == receiver (self-deposits)
            String depositSQL = "SELECT COALESCE(SUM(AMOUNT), 0) AS TOTAL FROM TRANSACTIONS WHERE RECEIVER_ACCOUNT = ? AND TX_TYPE = 'DEPOSIT' AND MONTH(CREATED_AT) = MONTH(CURDATE()) AND YEAR(CREATED_AT) = YEAR(CURDATE())";
            try (PreparedStatement ps = conn.prepareStatement(depositSQL)) {
                ps.setInt(1, accountNo);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next())
                        income = income.add(rs.getBigDecimal("TOTAL"));
                }
            }

            // 3. Current Month Expenses
            BigDecimal expenses = BigDecimal.ZERO;
            String expensesSQL = QueryLoader.get("analytics.current_month_expenses");
            try (PreparedStatement ps = conn.prepareStatement(expensesSQL)) {
                ps.setInt(1, accountNo);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next())
                        expenses = rs.getBigDecimal("TOTAL");
                }
            }

            // 4. Spending by Type
            JsonArray categories = new JsonArray();
            String typeSQL = QueryLoader.get("analytics.spending_by_type");
            try (PreparedStatement ps = conn.prepareStatement(typeSQL)) {
                ps.setInt(1, accountNo);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        JsonObject cat = new JsonObject();
                        cat.addProperty("type", rs.getString("TX_TYPE"));
                        cat.addProperty("amount", rs.getBigDecimal("TOTAL"));
                        categories.add(cat);
                    }
                }
            }

            // 5. Savings Rate
            double savingsRate = 0;
            if (income.compareTo(BigDecimal.ZERO) > 0) {
                savingsRate = income.subtract(expenses).doubleValue() / income.doubleValue() * 100;
                if (savingsRate < 0)
                    savingsRate = 0;
            }

            // Build response
            response.addProperty("success", true);
            response.add("monthlySpending", monthlyData);
            response.addProperty("income", income);
            response.addProperty("expenses", expenses);
            response.addProperty("savingsRate", Math.round(savingsRate * 10.0) / 10.0);
            response.add("spendingByType", categories);
            response.addProperty("currentMonth", now.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH));
            response.addProperty("currentYear", now.getYear());

        } catch (NumberFormatException e) {
            response.addProperty("success", false);
            response.addProperty("message", "Invalid account number");
        } catch (Exception e) {
            log.severe("Analytics API error: " + e.getMessage());
            response.addProperty("success", false);
            response.addProperty("message", "Server error: " + e.getMessage());
        }

        out.print(gson.toJson(response));
        out.flush();
    }

    private void setCorsHeaders(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
}
