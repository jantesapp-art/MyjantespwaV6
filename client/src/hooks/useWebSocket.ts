// Reference: javascript_websocket blueprint
import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { queryClient } from "@/lib/queryClient";

export function useWebSocket() {
  const { user, isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      // Authenticate with user ID
      ws.send(JSON.stringify({
        type: "authenticate",
        userId: user.id,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Invalidate relevant queries based on notification type
        if (data.type === "quote_updated") {
          queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        } else if (data.type === "invoice_created") {
          queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        } else if (data.type === "reservation_confirmed") {
          queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [isAuthenticated, user]);

  return wsRef;
}
