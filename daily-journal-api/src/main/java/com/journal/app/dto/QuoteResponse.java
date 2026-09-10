package com.journal.app.dto;

/** Response for GET /api/quote — matches the shape the frontend already expects. */
public class QuoteResponse {

    /** Quote text — field name "q" matches ZenQuotes.io format and the frontend. */
    private String q;
    /** Author name — field name "a" matches ZenQuotes.io format and the frontend. */
    private String a;

    public QuoteResponse() {}

    public QuoteResponse(String q, String a) {
        this.q = q;
        this.a = a;
    }

    public String getQ() { return q; }
    public void setQ(String q) { this.q = q; }

    public String getA() { return a; }
    public void setA(String a) { this.a = a; }
}
