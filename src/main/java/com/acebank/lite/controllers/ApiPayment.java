package com.acebank.lite.controllers;

import com.acebank.lite.service.BankService;
import com.acebank.lite.service.BankServiceImpl;
import com.acebank.lite.util.ConnectionManager;
import com.acebank.lite.util.QueryLoader;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.java.Log;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;

@Log
@WebServlet("/api/payment")
public class ApiPayment extends HttpServlet {

    private final BankService bankService = new BankServiceImpl();
    private final Gson gson = new Gson();

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setCorsHeaders(resp);
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setCorsHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();
        JsonObject responseJson = new JsonObject();

        try {
            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = req.getReader()) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
            }

            JsonObject body = gson.fromJson(sb.toString(), JsonObject.class);

            if (body == null || !body.has("accountNumber") || !body.has("amount")) {
                responseJson.addProperty("success", false);
                responseJson.addProperty("message", "accountNumber and amount are required");
                out.print(gson.toJson(responseJson));
                return;
            }

            int accountNumber = body.get("accountNumber").getAsInt();
            BigDecimal amount = body.get("amount").getAsBigDecimal();
            String paymentType = body.has("paymentType") ? body.get("paymentType").getAsString() : "Bill Payment";
            String payee = body.has("payee") ? body.get("payee").getAsString() : "";

            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                responseJson.addProperty("success", false);
                responseJson.addProperty("message", "Amount must be greater than zero");
                out.print(gson.toJson(responseJson));
                return;
            }

            // Atomic: debit balance + log transaction with custom remark
            String remark = paymentType + (payee.isEmpty() ? "" : " - " + payee);

            try (Connection conn = ConnectionManager.getConnection()) {
                try {
                    conn.setAutoCommit(false);

                    // 1. Debit the balance (only if sufficient funds)
                    String withdrawSql = QueryLoader.get("account.withdraw_balance");
                    try (PreparedStatement ps = conn.prepareStatement(withdrawSql)) {
                        ps.setBigDecimal(1, amount);
                        ps.setInt(2, accountNumber);
                        ps.setBigDecimal(3, amount);
                        int rows = ps.executeUpdate();
                        if (rows == 0) {
                            conn.rollback();
                            responseJson.addProperty("success", false);
                            responseJson.addProperty("message", "Insufficient balance or account not found");
                            out.print(gson.toJson(responseJson));
                            return;
                        }
                    }

                    // 2. Log the payment transaction with custom remark
                    String logSql = QueryLoader.get("transaction.log");
                    try (PreparedStatement ps = conn.prepareStatement(logSql)) {
                        ps.setInt(1, accountNumber); // SENDER_ACCOUNT
                        ps.setNull(2, java.sql.Types.INTEGER); // RECEIVER_ACCOUNT (null for payments)
                        ps.setBigDecimal(3, amount);
                        ps.setString(4, "WITHDRAWAL");
                        ps.setString(5, remark);
                        ps.executeUpdate();
                    }

                    conn.commit();
                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                }

                BigDecimal newBalance = bankService.getBalance(accountNumber);
                responseJson.addProperty("success", true);
                responseJson.addProperty("message", "Payment of ₹" + amount + " for " + paymentType + " successful!");
                responseJson.addProperty("balance", newBalance);
            }

        } catch (JsonSyntaxException e) {
            responseJson.addProperty("success", false);
            responseJson.addProperty("message", "Invalid JSON payload");
        } catch (NumberFormatException e) {
            responseJson.addProperty("success", false);
            responseJson.addProperty("message", "Invalid account number or amount");
        } catch (Exception e) {
            log.severe("Payment API error: " + e.getMessage());
            responseJson.addProperty("success", false);
            responseJson.addProperty("message", "Server error: " + e.getMessage());
        }

        out.print(gson.toJson(responseJson));
        out.flush();
    }

    private void setCorsHeaders(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
}
