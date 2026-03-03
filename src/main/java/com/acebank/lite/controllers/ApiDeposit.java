package com.acebank.lite.controllers;

import com.acebank.lite.service.BankService;
import com.acebank.lite.service.BankServiceImpl;
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

@Log
@WebServlet("/api/deposit")
public class ApiDeposit extends HttpServlet {

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

            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                responseJson.addProperty("success", false);
                responseJson.addProperty("message", "Amount must be greater than zero");
                out.print(gson.toJson(responseJson));
                return;
            }

            // Uses existing service which credits the account and logs DEPOSIT transaction
            boolean success = bankService.processDeposit(accountNumber, amount);

            if (success) {
                BigDecimal newBalance = bankService.getBalance(accountNumber);
                responseJson.addProperty("success", true);
                responseJson.addProperty("message", "Funds added successfully!");
                responseJson.addProperty("balance", newBalance);
            } else {
                responseJson.addProperty("success", false);
                responseJson.addProperty("message", "Could not process deposit. Please try again.");
            }

        } catch (JsonSyntaxException e) {
            responseJson.addProperty("success", false);
            responseJson.addProperty("message", "Invalid JSON payload");
        } catch (NumberFormatException e) {
            responseJson.addProperty("success", false);
            responseJson.addProperty("message", "Invalid account number or amount");
        } catch (Exception e) {
            log.severe("Deposit API error: " + e.getMessage());
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
