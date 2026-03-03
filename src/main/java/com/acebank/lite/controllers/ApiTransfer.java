package com.acebank.lite.controllers;

import com.acebank.lite.models.ServiceResponse;
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
@WebServlet("/api/transfer")
public class ApiTransfer extends HttpServlet {

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
            // Read JSON body
            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = req.getReader()) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
            }

            JsonObject body = gson.fromJson(sb.toString(), JsonObject.class);

            if (body == null || !body.has("fromAccount") || !body.has("toAccount") || !body.has("amount")) {
                responseJson.addProperty("success", false);
                responseJson.addProperty("message", "fromAccount, toAccount, and amount are required");
                out.print(gson.toJson(responseJson));
                return;
            }

            int fromAccount = body.get("fromAccount").getAsInt();
            int toAccount = body.get("toAccount").getAsInt();
            BigDecimal amount = body.get("amount").getAsBigDecimal();

            // Use existing service layer which handles validation, debit, credit, and
            // transaction logging
            ServiceResponse result = bankService.processTransfer(fromAccount, toAccount, amount);

            responseJson.addProperty("success", result.success());
            responseJson.addProperty("message", result.message());

            if (result.success()) {
                // Fetch updated balance for the sender
                BigDecimal newBalance = bankService.getBalance(fromAccount);
                responseJson.addProperty("balance", newBalance);
            }

        } catch (JsonSyntaxException e) {
            responseJson.addProperty("success", false);
            responseJson.addProperty("message", "Invalid JSON payload");
        } catch (NumberFormatException e) {
            responseJson.addProperty("success", false);
            responseJson.addProperty("message", "Invalid account number or amount");
        } catch (Exception e) {
            log.severe("Transfer API error: " + e.getMessage());
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
