import { useState, useEffect, useRef } from 'react';

interface ViewerCountData {
  viewerCount: number;
  isConnected: boolean;
  isLoading: boolean;
}

export function useViewerCount(streamId: string): ViewerCountData {
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string>(`user_${Math.random().toString(36).substr(2, 9)}`);

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`🔗 Connecting to WebSocket: ${wsUrl}`);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        setIsLoading(false);
        
        // Join the stream to start tracking viewers
        if (wsRef.current && streamId) {
          wsRef.current.send(JSON.stringify({
            type: 'join_stream',
            streamId,
            userId: userIdRef.current
          }));
          console.log(`👁️ Joined stream ${streamId} for viewer tracking`);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'joined_stream':
              console.log(`🎯 Successfully joined stream ${data.streamId}, viewers: ${data.viewerCount}`);
              setViewerCount(data.viewerCount);
              break;
              
            case 'viewer_count_update':
              if (data.streamId === streamId) {
                console.log(`📊 Viewer count updated for ${streamId}: ${data.viewerCount}`);
                setViewerCount(data.viewerCount);
              }
              break;
              
            case 'heartbeat_response':
              // Connection is alive
              break;
              
            case 'error':
              console.error('❌ WebSocket error from server:', data.message);
              break;
              
            default:
              console.log('📨 Unknown WebSocket message:', data);
              break;
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        setIsLoading(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect WebSocket...');
          connectWebSocket();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
        setIsLoading(false);
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setIsLoading(false);
    }
  };

  // Send heartbeat every 30 seconds to keep connection alive
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);

    return () => clearInterval(heartbeatInterval);
  }, []);

  // Connect when component mounts or streamId changes
  useEffect(() => {
    if (!streamId) return;
    
    connectWebSocket();

    // Cleanup on unmount or streamId change
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        // Send leave stream message before closing
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'leave_stream'
          }));
        }
        
        wsRef.current.close();
        wsRef.current = null;
      }
      
      setIsConnected(false);
      setIsLoading(true);
    };
  }, [streamId]);

  return {
    viewerCount,
    isConnected,
    isLoading
  };
}