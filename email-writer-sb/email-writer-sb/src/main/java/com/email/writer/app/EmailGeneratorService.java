package com.email.writer.app;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
public class EmailGeneratorService {

    private final WebClient webClient;


    @Value("${gemini.api.url}")
    private String geminiApiUrl;
    @Value("${gemini.api.key}")
    private String geminiApiKey;

    public EmailGeneratorService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    public String generateEmailReply(EmailRequest emailRequest){

        //Build the prompt
        String prompt = buildPrompt(emailRequest);

        //Craft a request
        Map<String, Object> requestBody = Map.of(
                "contents", new Object[] {
                        Map.of("parts", new Object[]{
                                Map.of("text", prompt)
                        })
                }
        );

        //Do request and get response
        String response = webClient.post()                                              //Specifies that this is a POST HTTP request.
                .uri(geminiApiUrl + geminiApiKey)                                  //Concatenates the base URL (geminiApiUrl) and the API key (geminiApiKey) to form the full API endpoint.
                .header("Content-Type","application/json")     //Adds a request header indicating that the request body will be in JSON format.
                .bodyValue(requestBody)                                             //Attaches the request payload (likely a JSON object or string) as the body of the POST request.
                .retrieve()                                            //Initiates the request and prepares to process the response.
                .bodyToMono(String.class)                             //Specifies that the response body will be mapped to a Mono<String> (a reactive wrapper for a single result).
                .block();                                            //Converts the reactive Mono<String> into a synchronous operation, blocking until the response is fully received. The response is stored as a plain String.

        //Return response
        return extractResponseContent(response);                   //The response (a JSON string) is passed to the extractResponseContent method to parse and extract specific data.
    }

    private String extractResponseContent(String response) {
        try {
            ObjectMapper mapper = new ObjectMapper();               //Creates an instance of Jackson's ObjectMapper for parsing JSON data.
            JsonNode rootNode = mapper.readTree(response);         //Parses the response string into a JsonNode object (a tree-like structure for traversing JSON).

            //Navigates through the JSON hierarchy to extract specific data:
            return rootNode.path("candidates")                       //A JSON array in response
                    .get(0)                                            //Accesses the first element in the candidates array.
                    .path("content")                               //A nested object within the first candidate.
                    .path("parts")                                //Another array under content.
                    .get(0)                                         //Accesses the first element in the parts array.
                    .path("text")                               //A property inside the parts object.
                    .asText();                                    // Convert the extended JSON value to plain JAVA sting
        } catch (Exception e) {
            return "Error processing request: " + e.getMessage();
        }
    }

    private String buildPrompt(EmailRequest emailRequest) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Generate a professional email reply for the following email content. Please don't generate a subject line ");
        if(emailRequest.getTone() != null && !emailRequest.getTone().isEmpty()){
            prompt.append("Use a ").append(emailRequest.getTone()).append(" tone.");
        }
        prompt.append("\n Original email: \n").append(emailRequest.getEmailContent());

        return prompt.toString();
    }
}
