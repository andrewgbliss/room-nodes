'use client';

import { useState, useEffect } from 'react';
import RoomCanvas from '@/components/RoomCanvas';
import type { Room, Door, World, Universe } from '@/types/room';
import { saveUniverseToStorage, loadUniverseFromStorage, exportUniverseToJSON, importUniverseFromJSON } from '@/lib/storage';
import { Pencil } from 'lucide-react';

const ROOM_WIDTH = 150;
const ROOM_HEIGHT = 100;

export default function Home() {
  const [universe, setUniverse] = useState<Universe>({
    id: 'universe-1',
    name: 'My Universe',
    worlds: [{
      id: 'world-1',
      name: 'World 1',
      rooms: [],
      doors: [],
    }],
  });
  const [currentWorldId, setCurrentWorldId] = useState<string>('world-1');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isConnectingMode, setIsConnectingMode] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomId, setNewRoomId] = useState('');
  const [newWorldName, setNewWorldName] = useState('');
  const [editingUniverseName, setEditingUniverseName] = useState(false);
  const [editingUniverseId, setEditingUniverseId] = useState(false);
  const [editingWorldId, setEditingWorldId] = useState<string | null>(null);
  const [editingWorldIdValue, setEditingWorldIdValue] = useState('');
  const [editingWorldDescription, setEditingWorldDescription] = useState(false);
  const [universeName, setUniverseName] = useState('My Universe');
  const [universeId, setUniverseId] = useState('universe-1');
  const [jsonPreview, setJsonPreview] = useState('');
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  const currentWorld = universe.worlds.find(w => w.id === currentWorldId) || universe.worlds[0];
  const rooms = currentWorld?.rooms || [];
  const doors = currentWorld?.doors || [];
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Load from localStorage on mount
  useEffect(() => {
    const loadedUniverse = loadUniverseFromStorage();
    if (loadedUniverse) {
      setUniverse(loadedUniverse);
      if (loadedUniverse.worlds.length > 0) {
        setCurrentWorldId(loadedUniverse.worlds[0].id);
      }
      setUniverseName(loadedUniverse.name);
      setUniverseId(loadedUniverse.id);
    }
  }, []);

  // Auto-save to localStorage and update JSON preview when universe changes
  useEffect(() => {
    const universeToSave = { ...universe, id: universeId, name: universeName };
    saveUniverseToStorage(universeToSave);
    setJsonPreview(exportUniverseToJSON(universeToSave));
  }, [universe, universeName, universeId]);

  const updateWorld = (worldId: string, updater: (world: World) => World) => {
    setUniverse({
      ...universe,
      worlds: universe.worlds.map(w => w.id === worldId ? updater(w) : w),
    });
  };

  const updateCurrentWorld = (updater: (world: World) => World) => {
    updateWorld(currentWorldId, updater);
  };

  const handleAddRoom = () => {
    if (!newRoomName.trim() || !newRoomId.trim()) {
      alert('Please enter both name and ID for the room');
      return;
    }
    
    if (rooms.some(r => r.id === newRoomId)) {
      alert('Room ID already exists in this world');
      return;
    }

    const newRoom: Room = {
      id: newRoomId.trim(),
      name: newRoomName.trim(),
      description: '',
      x: 100 + rooms.length * 20,
      y: 100 + rooms.length * 20,
      width: ROOM_WIDTH,
      height: ROOM_HEIGHT,
    };

    updateCurrentWorld(world => ({
      ...world,
      rooms: [...world.rooms, newRoom],
    }));

    setNewRoomName('');
    setNewRoomId('');
    setSelectedRoomId(newRoom.id);
  };

  const handleDeleteRoom = (roomId: string) => {
    updateCurrentWorld(world => ({
      ...world,
      rooms: world.rooms.filter(r => r.id !== roomId),
      doors: world.doors.filter(d => d.roomId1 !== roomId && d.roomId2 !== roomId),
    }));
    if (selectedRoomId === roomId) {
      setSelectedRoomId(null);
    }
  };

  const handleDeleteDoor = (doorId: string) => {
    updateCurrentWorld(world => ({
      ...world,
      doors: world.doors.filter(d => d.id !== doorId),
    }));
  };

  const handleEditRoom = () => {
    if (!selectedRoom) return;
    setEditingRoom({ ...selectedRoom });
  };

  const handleSaveEdit = () => {
    if (!editingRoom) return;
    
    if (!editingRoom.name.trim() || !editingRoom.id.trim()) {
      alert('Name and ID cannot be empty');
      return;
    }

    // Check if ID already exists (except for the current room)
    if (rooms.some(r => r.id === editingRoom.id && r.id !== selectedRoomId)) {
      alert('Room ID already exists in this world');
      return;
    }

    updateCurrentWorld(world => {
      const updatedRooms = world.rooms.map(r => 
        r.id === selectedRoomId ? editingRoom : r
      );

      // Update doors that reference this room's ID if it changed
      let updatedDoors = world.doors;
      if (editingRoom.id !== selectedRoomId) {
        updatedDoors = world.doors.map(d => ({
          ...d,
          roomId1: d.roomId1 === selectedRoomId ? editingRoom.id : d.roomId1,
          roomId2: d.roomId2 === selectedRoomId ? editingRoom.id : d.roomId2,
        }));
      }

      return {
        ...world,
        rooms: updatedRooms,
        doors: updatedDoors,
      };
    });

    setSelectedRoomId(editingRoom.id);
    setEditingRoom(null);
  };

  const handleCancelEdit = () => {
    setEditingRoom(null);
  };

  const toggleConnectingMode = () => {
    setIsConnectingMode(!isConnectingMode);
  };

  const handleConnectionCancel = () => {
    setIsConnectingMode(false);
  };

  const handleAddWorld = () => {
    if (!newWorldName.trim()) {
      alert('Please enter a world name');
      return;
    }

    const newWorld: World = {
      id: `world-${Date.now()}`,
      name: newWorldName.trim(),
      description: '',
      rooms: [],
      doors: [],
    };

    setUniverse({
      ...universe,
      worlds: [...universe.worlds, newWorld],
    });

    setNewWorldName('');
    setCurrentWorldId(newWorld.id);
  };

  const handleDeleteWorld = (worldId: string) => {
    if (universe.worlds.length === 1) {
      alert('Cannot delete the last world');
      return;
    }

    const updatedWorlds = universe.worlds.filter(w => w.id !== worldId);
    setUniverse({
      ...universe,
      worlds: updatedWorlds,
    });

    if (currentWorldId === worldId) {
      setCurrentWorldId(updatedWorlds[0].id);
    }
  };

  const handleStartEditWorldId = (worldId: string) => {
    setEditingWorldId(worldId);
    setEditingWorldIdValue(worldId);
  };

  const handleSaveWorldId = (oldWorldId: string) => {
    const newWorldId = editingWorldIdValue.trim();
    
    if (!newWorldId) {
      alert('World ID cannot be empty');
      setEditingWorldId(null);
      return;
    }

    if (universe.worlds.some(w => w.id === newWorldId && w.id !== oldWorldId)) {
      alert('World ID already exists');
      setEditingWorldId(null);
      return;
    }

    // Update world ID
    const updatedWorlds = universe.worlds.map(w => 
      w.id === oldWorldId ? { ...w, id: newWorldId } : w
    );

    setUniverse({
      ...universe,
      worlds: updatedWorlds,
    });

    // Update currentWorldId if it was the one being edited
    if (currentWorldId === oldWorldId) {
      setCurrentWorldId(newWorldId);
    }

    setEditingWorldId(null);
  };

  const handleCancelEditWorldId = () => {
    setEditingWorldId(null);
    setEditingWorldIdValue('');
  };

  const handleNewUniverse = () => {
    if (confirm('Are you sure you want to start a new universe? This will clear all current data.')) {
      const newUniverse: Universe = {
        id: 'universe-1',
        name: 'My Universe',
        worlds: [{
          id: 'world-1',
          name: 'World 1',
          description: '',
          rooms: [],
          doors: [],
        }],
      };
      setUniverse(newUniverse);
      setUniverseName('My Universe');
      setUniverseId('universe-1');
      setCurrentWorldId('world-1');
      setSelectedRoomId(null);
      setEditingRoom(null);
      setIsConnectingMode(false);
    }
  };

  const handleExport = () => {
    const json = exportUniverseToJSON({ ...universe, name: universeName });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${universeName || 'universe'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const importedUniverse = importUniverseFromJSON(text);
        if (importedUniverse) {
          setUniverse(importedUniverse);
          setUniverseName(importedUniverse.name);
          setUniverseId(importedUniverse.id);
          if (importedUniverse.worlds.length > 0) {
            setCurrentWorldId(importedUniverse.worlds[0].id);
          }
        } else {
          alert('Failed to import universe. Please check the JSON format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleImportFromText = (jsonText: string) => {
    const importedUniverse = importUniverseFromJSON(jsonText);
    if (importedUniverse) {
      setUniverse(importedUniverse);
      setUniverseName(importedUniverse.name);
      setUniverseId(importedUniverse.id);
      if (importedUniverse.worlds.length > 0) {
        setCurrentWorldId(importedUniverse.worlds[0].id);
      }
    } else {
      alert('Failed to import universe. Please check the JSON format.');
    }
  };

  return (
    <div className="h-screen w-screen bg-background overflow-hidden flex flex-col">
      <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
        <div className="flex justify-between items-center flex-shrink-0 mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
            {editingUniverseName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={universeName}
                  onChange={(e) => setUniverseName(e.target.value)}
                  className="text-3xl font-bold px-2 py-1 border border-border rounded bg-background text-foreground"
                  onBlur={() => setEditingUniverseName(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingUniverseName(false);
                    }
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-3xl font-bold">
                  {universeName || 'Room Nodes Editor'}
                </h1>
                <button
                  onClick={() => setEditingUniverseName(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded"
                  title="Edit universe name"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
            </div>
            <div className="flex items-center gap-2">
              {editingUniverseId ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">ID:</span>
                  <input
                    type="text"
                    value={universeId}
                    onChange={(e) => setUniverseId(e.target.value)}
                    className="text-sm font-mono px-2 py-1 border border-border rounded bg-background text-foreground"
                    onBlur={() => setEditingUniverseId(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingUniverseId(false);
                      }
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <span className="text-sm text-muted-foreground">ID:</span>
                  <span className="text-sm font-mono">{universeId}</span>
                  <button
                    onClick={() => setEditingUniverseId(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded"
                    title="Edit universe ID"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleNewUniverse}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
            >
              New Universe
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Import JSON
            </button>
            <button
              onClick={() => setShowJsonPreview(!showJsonPreview)}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              {showJsonPreview ? 'Hide' : 'Show'} JSON
            </button>
          </div>
        </div>

        {showJsonPreview && (
          <div className="bg-card border border-border rounded-lg p-4 flex-shrink-0 overflow-auto max-h-64">
            <h2 className="text-lg font-semibold mb-2">JSON Preview</h2>
            <textarea
              value={jsonPreview}
              onChange={(e) => {
                setJsonPreview(e.target.value);
                handleImportFromText(e.target.value);
              }}
              className="w-full h-64 font-mono text-sm p-3 border border-border rounded bg-background text-foreground resize-none"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Edit the JSON above to import changes. The world is auto-saved to localStorage.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2">
            {/* Worlds Section */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Worlds ({universe.worlds.length})</h2>
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="World Name"
                  value={newWorldName}
                  onChange={(e) => setNewWorldName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddWorld()}
                />
                <button
                  onClick={handleAddWorld}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                >
                  Add World
                </button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {universe.worlds.map(world => (
                  <div
                    key={world.id}
                    className={`p-2 rounded text-sm transition-colors ${
                      world.id === currentWorldId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    <div
                      onClick={() => !editingWorldId && setCurrentWorldId(world.id)}
                      className={`cursor-pointer ${editingWorldId === world.id ? 'pointer-events-none' : ''}`}
                    >
                      <div className="font-medium">{world.name}</div>
                      {editingWorldId === world.id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs opacity-75">ID:</span>
                          <input
                            type="text"
                            value={editingWorldIdValue}
                            onChange={(e) => setEditingWorldIdValue(e.target.value)}
                            className="text-xs font-mono px-1 py-0.5 border border-border rounded bg-background text-foreground flex-1"
                            onBlur={() => handleSaveWorldId(world.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveWorldId(world.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEditWorldId();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-1 group/item">
                          <span className="text-xs opacity-75">ID:</span>
                          <span className="text-xs font-mono">{world.id}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditWorldId(world.id);
                            }}
                            className="opacity-0 group-hover/item:opacity-100 transition-opacity ml-1 p-0.5 hover:bg-background/20 rounded"
                            title="Edit world ID"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                      <div className="text-xs opacity-75 mt-0.5">
                        {world.rooms.length} rooms
                      </div>
                    </div>
                    {universe.worlds.length > 1 && editingWorldId !== world.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWorld(world.id);
                        }}
                        className="text-destructive hover:text-destructive/80 ml-auto mt-1 text-xs"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Current World Section */}
            {currentWorld && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-3">Current World</h2>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Name:</p>
                    <p className="font-medium">{currentWorld.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID:</p>
                    <p className="font-mono text-sm">{currentWorld.id}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm text-muted-foreground">Description:</label>
                      {!editingWorldDescription && (
                        <button
                          onClick={() => setEditingWorldDescription(true)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    {editingWorldDescription ? (
                      <div className="space-y-2">
                        <textarea
                          value={currentWorld.description || ''}
                          onChange={(e) => {
                            updateCurrentWorld(world => ({
                              ...world,
                              description: e.target.value,
                            }));
                          }}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground min-h-[100px] resize-y text-sm"
                          placeholder="World description..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingWorldDescription(false)}
                            className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-xs"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap min-h-[20px]">
                        {currentWorld.description || <span className="text-muted-foreground italic">No description</span>}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Add Room Section */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Add Room</h2>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Room Name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRoom()}
                />
                <input
                  type="text"
                  placeholder="Room ID"
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRoom()}
                />
                <button
                  onClick={handleAddRoom}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Add Room
                </button>
              </div>
            </div>

            {/* Selected Room Section */}
            {selectedRoom && !editingRoom && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-3">Selected Room</h2>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Name:</p>
                    <p className="font-medium">{selectedRoom.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID:</p>
                    <p className="font-mono text-sm">{selectedRoom.id}</p>
                  </div>
                  {selectedRoom.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description:</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedRoom.description}</p>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleEditRoom}
                      className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(selectedRoom.id)}
                      className="flex-1 px-3 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Room Section */}
            {editingRoom && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-3">Edit Room</h2>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm text-muted-foreground">Name:</label>
                    <input
                      type="text"
                      value={editingRoom.name}
                      onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">ID:</label>
                    <input
                      type="text"
                      value={editingRoom.id}
                      onChange={(e) => setEditingRoom({ ...editingRoom, id: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Description:</label>
                    <textarea
                      value={editingRoom.description || ''}
                      onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground mt-1 min-h-[80px] resize-y"
                      placeholder="Room description..."
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Connection Mode Toggle */}
            <div className="bg-card border border-border rounded-lg p-4">
              <button
                onClick={toggleConnectingMode}
                className={`w-full px-4 py-2 rounded-md transition-colors ${
                  isConnectingMode
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {isConnectingMode ? 'Cancel Connection' : 'Connect Rooms'}
              </button>
              {isConnectingMode && (
                <p className="text-xs text-muted-foreground mt-2">
                  Click on a room edge to start, then click another room edge to connect
                </p>
              )}
            </div>

            {/* Rooms List */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Rooms ({rooms.length})</h2>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {rooms.map(room => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`p-2 rounded cursor-pointer text-sm transition-colors ${
                      room.id === selectedRoomId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {room.name} ({room.id})
                  </div>
                ))}
                {rooms.length === 0 && (
                  <p className="text-sm text-muted-foreground">No rooms yet</p>
                )}
              </div>
            </div>

            {/* Doors List */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Doors ({doors.length})</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {doors.map(door => {
                  const room1 = rooms.find(r => r.id === door.roomId1);
                  const room2 = rooms.find(r => r.id === door.roomId2);
                  return (
                    <div
                      key={door.id}
                      className="p-2 bg-secondary rounded text-sm flex justify-between items-center"
                    >
                      <span>
                        {room1?.name || door.roomId1} ↔ {room2?.name || door.roomId2}
                      </span>
                      <button
                        onClick={() => handleDeleteDoor(door.id)}
                        className="text-destructive hover:text-destructive/80 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                {doors.length === 0 && (
                  <p className="text-sm text-muted-foreground">No doors yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            <div className="bg-card border border-border rounded-lg p-4 flex-1 flex flex-col min-h-0">
              <div className="mb-2 text-sm text-muted-foreground flex-shrink-0">
                World: <span className="font-semibold text-foreground">{currentWorld?.name}</span>
              </div>
              <div className="flex-1 min-h-0">
              <RoomCanvas
                rooms={rooms}
                doors={doors}
                onRoomsChange={(newRooms) => {
                  updateCurrentWorld(world => ({ ...world, rooms: newRooms }));
                }}
                onDoorsChange={(newDoors) => {
                  updateCurrentWorld(world => ({ ...world, doors: newDoors }));
                }}
                selectedRoomId={selectedRoomId}
                onRoomSelect={setSelectedRoomId}
                isConnectingMode={isConnectingMode}
                onConnectionCancel={handleConnectionCancel}
              />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
