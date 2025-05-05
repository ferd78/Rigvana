import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  Image,
  Modal,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import MainLayout from "../components/MainLayout";
import AddNewButton from "../components/AddNewButton";
import RefreshButton from "../components/RefreshButton";
import { Ionicons } from "@expo/vector-icons";
import "../global.css";
import { FELIX_URL } from "../ipconfig";
import { getToken } from "../utils/auth";

const COMPONENT_SLOTS = [
  { key: "cpu",          label: "CPU",          placeholder: "Pick your CPU..." },
  { key: "gpu",          label: "GPU",          placeholder: "Pick your GPU..." },
  { key: "motherboard",  label: "MOTHERBOARD",  placeholder: "Pick your motherboard..." },
  { key: "ram",          label: "RAM",          placeholder: "Pick your RAM..." },
  { key: "storage",      label: "STORAGE",      placeholder: "Pick your storage..." },
  { key: "cooling",      label: "COOLING",      placeholder: "Pick your cooler..." },
  { key: "psu",          label: "PSU",          placeholder: "Pick your power supply..." },
  { key: "case",         label: "CASE",         placeholder: "Pick your case..." },
];

export default function Home() {
  const [pcBuilds, setPcBuilds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [componentOptions, setComponentOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const tokenRef = useRef(null);

  // edit/view state
  const [editingIndex, setEditingIndex] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewBuild, setViewBuild] = useState(null);

  const [selectedComponents, setSelectedComponents] = useState(
    COMPONENT_SLOTS.reduce((acc, s) => ({ ...acc, [s.key]: null }), {})
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [buildName, setBuildName] = useState("");
  const [buildDesc, setBuildDesc] = useState("");
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedBuildIndex, setSelectedBuildIndex] = useState(null);

  // load token + builds
  useEffect(() => {
    (async () => {
      const token = await getToken();
      setUserToken(token);
      tokenRef.current = token;
      if (token) await fetchBuilds();
    })();
  }, []);

  // fetch builds
  const fetchBuilds = async () => {
    if (!tokenRef.current) return;
    setRefreshing(true);
    try {
      const res = await fetch(`${FELIX_URL}/get-builds`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPcBuilds(data);
    } catch {
      Alert.alert("Error", "Could not load builds");
    } finally {
      setRefreshing(false);
    }
  };

  // fetch component options
  useEffect(() => {
    if (selectedSlot && !selectedComponent && userToken) {
      (async () => {
        setLoadingComponents(true);
        try {
          const res = await fetch(
            `${FELIX_URL}/get-components/${selectedSlot}`,
            { headers: { Authorization: `Bearer ${userToken}` } }
          );
          if (!res.ok) throw new Error();
          const data = await res.json();
          setComponentOptions(data);
        } catch {
          Alert.alert("Error", `Could not load ${selectedSlot}`);
        } finally {
          setLoadingComponents(false);
        }
      })();
    }
  }, [selectedSlot, selectedComponent, userToken]);

  // handle back navigation
  const handleBack = () => {
    if (selectedComponent) {
      setSelectedComponent(null);
    } else if (selectedSlot) {
      setSelectedSlot(null);
    } else {
      setCreating(false);
      setEditingIndex(null);
    }
  };

  // save or update build
  const handleSaveBuild = async () => {
    if (!userToken) {
      Alert.alert("Error", "Login required");
      return;
    }
    if (!buildName.trim()) {
      Alert.alert("Error", "Build name is required");
      return;
    }
    const missing = COMPONENT_SLOTS.filter((s) => !selectedComponents[s.key]);
    if (missing.length) {
      Alert.alert(
        "Error",
        `Missing: ${missing.map((m) => m.label).join(", ")}`
      );
      return;
    }

    setLoading(true);
    const isEdit = editingIndex != null;
    const payload = {
      name: buildName,
      description: buildDesc,
      components: Object.fromEntries(
        Object.entries(selectedComponents).map(([k, v]) => [k, v.id])
      ),
    };
    const url = isEdit
      ? `${FELIX_URL}/update-build/${pcBuilds[editingIndex]?.id}`
      : `${FELIX_URL}/create-build`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url,
        { method,
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) throw new Error();
      await fetchBuilds();
      // reset form
      setModalVisible(false);
      setCreating(false);
      setEditingIndex(null);
      setBuildName("");
      setBuildDesc("");
      setSelectedSlot(null);
      setSelectedComponent(null);
      setSelectedComponents(
        COMPONENT_SLOTS.reduce((acc, s) => ({ ...acc, [s.key]: null }), {})
      );
    } catch {
      Alert.alert("Error", "Save failed");
    } finally {
      setLoading(false);
    }
  };

  // delete build
  const handleDeleteBuild = async () => {
    setLoading(true);
    try {
      const id = pcBuilds[selectedBuildIndex]?.id;
      const res = await fetch(`${FELIX_URL}/delete-build/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) throw new Error();
      await fetchBuilds();
    } catch {
      Alert.alert("Error", "Delete failed");
    } finally {
      setActionModalVisible(false);
      setLoading(false);
    }
  };

  // view build details
  const handleViewBuild = async () => {
    setActionModalVisible(false);
    const id = pcBuilds[selectedBuildIndex]?.id;
    try {
      const res = await fetch(`${FELIX_URL}/get-certain-build/${id}`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setViewBuild(data);
      setViewModalVisible(true);
    } catch {
      Alert.alert("Error", "Load details failed");
    }
  };

  // edit build
  const handleEditBuild = async () => {
    setActionModalVisible(false);
    const id = pcBuilds[selectedBuildIndex]?.id;
    try {
      const res = await fetch(`${FELIX_URL}/get-certain-build/${id}`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedComponents(data.components);
      setBuildName(data.name);
      setBuildDesc(data.description);
      setEditingIndex(selectedBuildIndex);
      setCreating(true);
    } catch {
      Alert.alert("Error", "Load for edit failed");
    }
  };

  // loading screen when not creating
  if (loading && !creating) {
    return (
      <MainLayout>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </MainLayout>
    );
  }

  // header title
  const headerTitle =
    selectedComponent?.name ??
    (selectedSlot
      ? `${String(selectedSlot).toUpperCase()} Selections:`
      : editingIndex !== null
      ? "Edit PC Build:"
      : "New PC Build:");

  // slot renderer
  const renderSlot = (item) => {
    const chosen = selectedComponents[item.key];
    return (
      <Pressable
        key={item.key}
        onPress={() => { setSelectedSlot(item.key); setSelectedComponent(null); }}
        className="flex-row justify-between items-center bg-[#f8f2f9] rounded-xl p-4 mb-2"
      >
        <View className="flex-row items-center">
          <View className="bg-black w-10 h-10 rounded-md items-center justify-center">
            <Text className="text-white font-bold">{item.label[0]}</Text>
          </View>
          <View className="ml-3">
            <Text className="font-black text-black">{item.label}</Text>
            <Text className="text-gray-700 text-xs">{chosen?.name ?? item.placeholder}</Text>
          </View>
        </View>
        <Ionicons name="add-circle-outline" size={24} color="#000" />
      </Pressable>
    );
  };

  // component option renderer
  const renderComponentItem = ({ item }) => (
    <Pressable
      onPress={() => setSelectedComponent(item)}
      className="border border-gray-700 rounded-xl m-2 p-4 flex-row items-center justify-between overflow-hidden"
    >
      <View className="flex-row items-center">
        <Image source={{ uri: item.image_url }} className="w-12 h-12 rounded-md" />
        <View className="ml-3 flex-1">
          <Text className="text-white font-bold text-sm">{item?.name ?? ""}</Text>
          <Text className="text-gray-300 text-xs mt-1">Rp {item.price?.toLocaleString() ?? "-"}</Text>
          {item.rating != null && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text className="text-gray-300 text-xs ml-1">{Number(item.rating).toFixed(1)}</Text>
            </View>
          )}
        </View>
        <Ionicons name="add-circle-outline" size={20} color="white" />
      </View>
      
    </Pressable>
  );

  // build card renderer
  const renderBuildCard = ({ item, index }) => (
    <View className="flex-row items-center bg-[#9fcfff] rounded-xl p-4 mx-4 my-2 justify-between">
      <View className="flex-1 mr-4">
        <Text className="font-bold text-lg">{item?.name ?? ""}</Text>
        <Text className="text-sm">{item?.description ?? ""}</Text>
      </View>
      <Pressable onPress={() => { setSelectedBuildIndex(index); setActionModalVisible(true); }}>
        <Ionicons name="chevron-forward" size={24} color="#000" />
      </Pressable>
    </View>
  );

  return (
    <MainLayout>
      <SafeAreaView className="flex-1">
        {creating ? (
          <>
            {/* Header */}
            <View className="flex-row justify-between items-center p-4">
              <Text className="text-white text-lg font-bold flex-shrink">
                {headerTitle}
              </Text>
              <Pressable onPress={handleBack}>
                <Ionicons name="arrow-back" size={28} color="#fff" />
              </Pressable>
            </View>

            {/* Slot list */}
            {!selectedSlot && !selectedComponent && (
              <View className="flex-1 px-4">
                {COMPONENT_SLOTS.map(renderSlot)}
              </View>
            )}

            {/* Options list */}
            {selectedSlot && !selectedComponent && (
              loadingComponents
              ? <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#fff" />
                </View>
              : componentOptions.length === 0
                ? <View className="flex-1 justify-center items-center">
                    <Text className="text-white">
                      No {selectedSlot} options
                    </Text>
                  </View>
                : <FlatList data={componentOptions} renderItem={renderComponentItem} keyExtractor={(i)=>i.id.toString()} contentContainerStyle={{ paddingBottom:20 }} />
            )}

            {/* Detail view */}
            {selectedComponent && (
              <View className="m-4 p-4 border border-gray-600 rounded-xl">
                <Image source={{ uri:selectedComponent.image_url }} className="w-24 h-24 rounded mb-3"/>
                <Text className="text-white font-bold mb-1">
                  {selectedComponent.name}
                </Text>

                <Text className="text-white text-sm mb-2">
                  Rp {selectedComponent.price?.toLocaleString() ?? "-"}
                </Text>

                {selectedComponent.rating != null && (
                  <View className="flex-row items-center mb-4">
                  <Ionicons name="star" size={16} color="#FFD700"/>
                  <Text className="text-white text-xs ml-1">
                    {Number(selectedComponent.rating).toFixed(1)}
                    </Text>
                  </View>)}
                <Text className="text-white text-xs mb-4">{selectedComponent.description || 'No description available'}</Text>
                <Pressable onPress={()=>{setSelectedComponents(prev=>({...prev,[selectedSlot]:selectedComponent}));
                setSelectedComponent(null);
                setSelectedSlot(null);}} 
                className="bg-[#9fcfff] rounded-full p-3 mb-2">
                  <Text className="text-center font-bold text-black">Add to Build</Text></Pressable>
                <Pressable onPress={()=>setSelectedComponent(null)} className="bg-gray-700 rounded-full p-3">
                  <Text className="text-center font-bold text-white">
                    Cancel
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Save Build button */}
            {!selectedSlot && !selectedComponent && (
              <Pressable onPress={()=>setModalVisible(true)} className="self-center p-3" disabled={loading}>
                <Text className="text-red-500 font-bold text-xl underline mb-12">
                  {loading ? ( 
                    editingIndex != null ? "Updating..." : "Saving...") 
                    : ( editingIndex !=null ? "Update Build" : "Save Build")}  
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text className="text-2xl font-bold text-white m-4">
              My PC Builds
            </Text>

            <FlatList data={pcBuilds} 
            renderItem={renderBuildCard} 
            keyExtractor={(b)=>b.id.toString()} 
            refreshing={refreshing} 
            onRefresh={fetchBuilds} 
            contentContainerStyle={ pcBuilds.length === 0 ? {flexGrow: 1, justifyContent:'center', alignItems: 'center'} : undefined} 
            ListEmptyComponent={
            <Text className="text-white text-base">
              No builds yet!
            </Text>
            }
            />
            <View className="absolute bottom-4 w-full px-6 flex-row justify-between">
              <RefreshButton onPress={fetchBuilds}/>
              <AddNewButton onPress={()=>setCreating(true)}/>
            </View>
          </>
        )}
      </SafeAreaView>

      {/* Save Build Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={()=>setModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-[#222] p-5 rounded-xl w-4/5">
            <Text className="text-white text-lg font-bold mb-3">
              {editingIndex!=null?"Update Build":"Save Build"}
            </Text>
            <TextInput placeholder="Build Name" placeholderTextColor="#999" value={buildName} onChangeText={setBuildName} className="bg-[#333] text-white rounded p-2 mb-3" />
            <TextInput placeholder="Description (Optional)" placeholderTextColor="#999" value={buildDesc} onChangeText={setBuildDesc} className="bg-[#333] text-white rounded p-2 mb-3 h-20" multiline />
            <Pressable onPress={handleSaveBuild} className="bg-[#9fcfff] rounded p-3 mb-2" disabled={loading}>
              <Text className="text-center font-bold text-black">
                {loading ? (editingIndex != null? "Updating" : "Saving") 
                : (editingIndex != null ? "Update":"Save")}  
              </Text>
            </Pressable>
            <Pressable onPress={()=>setModalVisible(false)} className="bg-gray-600 rounded p-3" disabled={loading}>
              <Text className="text-center font-bold text-white">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* View Modal */}
      <Modal 
      visible={viewModalVisible} 
      transparent 
      animationType="fade" 
      onRequestClose={()=>setViewModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-zinc-800 p-4 rounded-lg w-4/5">
            <Text className="text-white text-xl font-bold mb-2">
              {viewBuild?.name}
            </Text>

            <Text className="text-gray-300 mb-4">
              {viewBuild?.description}
            </Text>

            {viewBuild && Object.entries(viewBuild.components).map(([slot,comp])=>
              (<Text key={slot} className="text-white">{slot.toUpperCase()}: {comp?.name ?? comp}
              </Text>))}
            
            <Pressable onPress={()=>setViewModalVisible(false)} 
            className="mt-4 self-center">
              <Text className="text-ymblue font-bold">
                Close
              </Text>
            </Pressable>
            
          </View>
        </View>
      </Modal>

      {/* Action Modal */}
      <Modal 
      visible={actionModalVisible} 
      transparent 
      animationType="fade" 
      onRequestClose={()=>setActionModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-semiblack w-48 p-4 rounded-xl">
            <Pressable 
            onPress={handleViewBuild} 
            className="bg-zinc-700 rounded-xl p-3 mb-3">
              <View className="flex-row items-center justify-center gap-2">
                <Text className="text-white font-bold">
                  View
                </Text>
                <Ionicons name="eye-outline" color="#fff" size={20} />
              </View>
            </Pressable>
            <Pressable onPress={handleEditBuild} className="bg-ymblue rounded-xl p-3 mb-3">
              <View className="flex-row items-center justify-center gap-2">
                <Text className="text-white font-bold">
                  Edit
                </Text>
                <Ionicons name="create-outline" color="#fff" size={20} />
              </View>
            </Pressable>

            <Pressable 
            onPress={handleDeleteBuild}
            className="bg-red-500 rounded-xl p-3 mb-3">
              <View className="flex-row items-center justify-center gap-2">
                <Text className="text-white font-bold">
                  Delete
                </Text>
                <Ionicons name="trash-outline" color="#fff" size={20} />
              </View>
            </Pressable>

            <Pressable onPress={()=>setActionModalVisible(false)} className="items-center">
              <Ionicons name="close-outline" color="white" size={24} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
}
