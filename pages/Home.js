import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, SafeAreaView, Image, Modal, TextInput, FlatList, Alert, ActivityIndicator } from "react-native";
import MainLayout from "../components/MainLayout";
import AddNewButton from "../components/AddNewButton";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import "../global.css";
import { HARMAN_URL } from "../ipconfig";
import { FELIX_URL } from "../ipconfig";
import { getToken } from '../utils/auth';
import RefreshButton from "../components/RefreshButton";


const COMPONENT_SLOTS = [
  { key: "cpu", label: "CPU", placeholder: "Pick your CPU..." },
  { key: "gpu", label: "GPU", placeholder: "Pick your GPU..." },
  { key: "motherboard", label: "MOTHERBOARD", placeholder: "Pick your motherboard..." },
  { key: "ram", label: "RAM", placeholder: "Pick your RAM..." },
  { key: "storage", label: "STORAGE", placeholder: "Pick your storage..." },
  { key: "cooling", label: "COOLING", placeholder: "Pick your cooler..." },
  { key: "psu", label: "PSU", placeholder: "Pick your power supply..." },
  { key: "case", label: "CASE", placeholder: "Pick your case..." },
];

function Home() {
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

  const [selectedComponents, setSelectedComponents] = useState(
    COMPONENT_SLOTS.reduce((acc, s) => ({ ...acc, [s.key]: null }), {})
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [buildName, setBuildName] = useState("");
  const [buildDesc, setBuildDesc] = useState("");
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedBuildIndex, setSelectedBuildIndex] = useState(null);

  // Get token from AsyncStorage
  useEffect(() => {
    const loadTokenAndData = async () => {
      const token = await getToken();
      console.log('Token loaded:', token);
      setUserToken(token);
      tokenRef.current = token;
      if (token) {
        await fetchBuilds();
      }
    };
    loadTokenAndData();
  }, []);

  // Fetch components when a slot is selected
  useEffect(() => {
    if (selectedSlot && !selectedComponent && userToken) {
      const fetchComponents = async () => {
        setLoadingComponents(true);
        try {
          const response = await fetch(`${FELIX_URL}/get-components/${selectedSlot}`, {
            headers: {
              "Authorization": `Bearer ${userToken}`,
            },
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch ${selectedSlot}`);
          }
          
          const data = await response.json();
          setComponentOptions(data);
        } catch (error) {
          console.error(`Error fetching ${selectedSlot}:`, error);
          Alert.alert("Error", `Could not load ${selectedSlot} options`);
        } finally {
          setLoadingComponents(false);
        }
      };
      fetchComponents();
    }
  }, [selectedSlot, selectedComponent, userToken]);

  useEffect(() => {
    console.log('[HOME] Component mounted - checking token');
    const loadToken = async () => {
      const token = await AsyncStorage.getItem('userToken');
      console.log('[HOME] Token from storage:', token); // 👈 Critical debug point
      // ...
    };
    loadToken();
  }, []);

  // Fetch user's builds
  const fetchBuilds = async () => {
    const token = tokenRef.current; // Use the ref
    console.log('[FETCH] Attempting to fetch builds with token:', token);
    if (!token) {
      console.log("No token available");
      return;
    }
    
    try {

      
      setRefreshing(true);
      const response = await fetch(`${FELIX_URL}/get-builds`, {
        headers: {
          "Authorization": `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch builds");
      }

      const data = await response.json();
      setPcBuilds(data);
    } catch (error) {
      console.error("Error fetching builds:", error);
      
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userToken) {
      fetchBuilds();
    }
  }, [userToken]);

  const handleBack = () => {
    if (selectedComponent) setSelectedComponent(null);
    else if (selectedSlot) setSelectedSlot(null);
    else setCreating(false);
  };

  const handleDeleteBuild = async (buildId) => {
    try {
      setLoading(true);
      const response = await fetch(`${FELIX_URL}/delete-build/${buildId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete build");
      }

      await fetchBuilds();
      
    } catch (error) {
      console.error("Error deleting build:", error);
      Alert.alert("Error", "Could not delete build");
    } finally {
      setLoading(false);
      setActionModalVisible(false);
    }
  };

  const handleSaveBuild = async () => {
    if (!userToken) {
      Alert.alert("Error", "You need to be logged in to save builds");
      return;
    }

    if (!buildName.trim()) {
      Alert.alert("Error", "Build name is required");
      return;
    }

    const missingComponents = COMPONENT_SLOTS.filter(slot => !selectedComponents[slot.key]);
    if (missingComponents.length > 0) {
      Alert.alert("Error", `Please select all components. Missing: ${missingComponents.map(c => c.label).join(", ")}`);
      return;
    }

    try {
      setLoading(true);
      const buildData = {
        name: buildName,
        description: buildDesc,
        components: Object.keys(selectedComponents).reduce((acc, key) => {
          acc[key] = selectedComponents[key]?.id || null;
          return acc;
        }, {})
      };

      const response = await fetch(`${FELIX_URL}/create-build`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildData),
      });

      if (!response.ok) {
        throw new Error("Failed to create build");
      }

      
      
      // Reset form
      setModalVisible(false);
      setBuildName("");
      setBuildDesc("");
      setCreating(false);
      setSelectedSlot(null);
      setSelectedComponent(null);
      setSelectedComponents(
        COMPONENT_SLOTS.reduce((acc, s) => ({ ...acc, [s.key]: null }), {})
      );
      
      await fetchBuilds();
    } catch (error) {
      console.error("Error creating build:", error);
      Alert.alert("Error", "Could not create build");
    } finally {
      setLoading(false);
    }
  };

  const renderSlot = (item) => {
    const chosen = selectedComponents[item.key];
    return (
      <Pressable
        key={item.key}
        onPress={() => { setSelectedSlot(item.key); setSelectedComponent(null); }}
        className="flex-row justify-between items-center bg-[#f8f2f9] rounded-xl p-[15px] mb-1.5"
      >
        <View className="flex-row items-center">
          <View className="bg-black w-9 h-9 rounded-md items-center justify-center">
            <Text className="text-white text-lg font-bold">{item.label[0]}</Text>
          </View>
          <View className="ml-2">
            <Text className="text-base font-black text-black">{item.label}</Text>
            <Text className="text-xs text-gray-700">{chosen ? chosen.name : item.placeholder}</Text>
          </View>
        </View>
        <Ionicons name="add-circle-outline" size={24} color="#000" />
      </Pressable>
    );
  };

  const renderComponentItem = ({ item }) => (
    <Pressable
      onPress={() => setSelectedComponent(item)}
      className="border border-gray-700 rounded-xl m-2 p-5 flex-row items-center justify-between"
    >
      <View className="flex-row items-center">
        <Image 
          source={{ uri: item.image_url }} 
          className="w-12 h-12 rounded-md"
          defaultSource={require('../assets/images/intel_i9.jpg')}
        />
        <View className="ml-3 flex-1">
          <Text className="text-white text-sm font-bold">{item.name}</Text>
          <Text className="text-gray-300 text-xs mt-1">Rp {item.price?.toLocaleString() || 'Price not available'}</Text>
          {item.rating && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text className="ml-1 text-gray-300 text-xs">
                {typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="add-circle-outline" size={20} color="#fff" className="right-6" />
    </Pressable>
  );

  const renderBuildCard = ({ item, index }) => (
    <View className="flex-row items-center bg-[#9fcfff] rounded-xl p-4 mx-4 my-2">
      <View className="flex-1">
        <Text className="text-lg font-bold mb-1">{item.name}</Text>
        <Text className="text-sm">{item.description}</Text>
      </View>
      <Pressable
        onPress={() => {
          setSelectedBuildIndex(index);
          setActionModalVisible(true);
        }}
      >
        <Ionicons name="chevron-forward" size={24} color="#000" />
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <MainLayout>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SafeAreaView className="flex-1">
        {creating ? (
          <>
            <View className="flex-row justify-between items-center p-4">
              <Text className="text-white text-lg font-bold mr-24">
                {selectedComponent
                  ? selectedComponent.name
                  : selectedSlot
                  ? `${selectedSlot.toUpperCase()} Selections:`
                  : "New PC Build:"}
              </Text>
              <Pressable onPress={handleBack}>
                <Ionicons name="arrow-back" size={28} color="#fff" />
              </Pressable>
            </View>

            {!selectedSlot && !selectedComponent && (
              <View className="flex-1 px-4">
                {COMPONENT_SLOTS.map(renderSlot)}
              </View>
            )}

            {selectedSlot && !selectedComponent && (
              loadingComponents ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color="#ffffff" />
                </View>
              ) : componentOptions.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                  <Text className="text-white">No {selectedSlot} options available</Text>
                </View>
              ) : (
                <FlatList
                  data={componentOptions}
                  renderItem={renderComponentItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              )
            )}

            {selectedComponent && (
              <View className="m-4 p-4 border border-gray-600 rounded-xl">
                <Image 
                  source={{ uri: selectedComponent.image_url }} 
                  className="w-24 h-24 rounded mb-3"
                  defaultSource={require('../assets/images/intel_i9.jpg')}
                />
                <Text className="text-white text-base font-bold mb-2">{selectedComponent.name}</Text>
                <Text className="text-white text-sm mb-1">Rp {selectedComponent.price?.toLocaleString() || 'Price not available'}</Text>
                {selectedComponent.rating && (
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text className="ml-1 text-white text-xs">
                      {typeof selectedComponent.rating === 'number' 
                        ? selectedComponent.rating.toFixed(1) 
                        : selectedComponent.rating}
                    </Text>
                  </View>
                )}
                <Text className="text-white text-xs mb-4">{selectedComponent.description || 'No description available'}</Text>

                <Pressable
                  onPress={() => {
                    setSelectedComponents(prev => ({
                      ...prev,
                      [selectedSlot]: selectedComponent
                    }));
                    setSelectedComponent(null);
                    setSelectedSlot(null);
                  }}
                  className="bg-[#9fcfff] rounded-full p-3 mb-3"
                >
                  <Text className="text-center font-bold text-black">Add to Build</Text>
                </Pressable>
                <Pressable onPress={() => setSelectedComponent(null)} className="bg-gray-700 rounded-full p-3">
                  <Text className="text-center font-bold text-white">Cancel</Text>
                </Pressable>
              </View>
            )}

      {!selectedSlot && !selectedComponent && (
        <Pressable 
          onPress={() => setModalVisible(true)} 
          className="self-center p-3"
          disabled={loading}
        >
          <Text className="text-[#ff3b30] text-base font-bold underline">
            {loading ? "Saving..." : "Save Build"}
          </Text>
        </Pressable>
      )}
      </>
      ) : (
      <>
        <Text className="text-2xl font-bold text-white m-4">My PC Builds: </Text>
        <FlatList
          data={pcBuilds}
          renderItem={renderBuildCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            pcBuilds.length === 0
              ? { flexGrow: 1, justifyContent: 'center', alignItems: 'center' }
              : undefined
          }
          refreshing={refreshing}
          onRefresh={fetchBuilds}
          ListEmptyComponent={
            <Text className="text-center text-white text-base">
              No builds yet!
            </Text>
          }
        />
        <View className="absolute bottom-6 flex-row justify-between w-full px-6">
          <RefreshButton onPress={fetchBuilds} />
          {!creating && <AddNewButton onPress={() => setCreating(true)} />}
        </View>
      </>
      )}
      </SafeAreaView>

      {/* Save Build Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-[#222] p-5 rounded-xl w-4/5">
            <Text className="text-white text-lg font-bold mb-3">Save Build</Text>
            <TextInput
              placeholder="Build Name"
              placeholderTextColor="#999"
              value={buildName}
              onChangeText={setBuildName}
              className="bg-[#333] text-white rounded p-2 mb-3"
            />
            <TextInput
              placeholder="Description (Optional)"
              placeholderTextColor="#999"
              value={buildDesc}
              onChangeText={setBuildDesc}
              className="bg-[#333] text-white rounded p-2 mb-3 h-20"
              multiline
            />
            <Pressable 
              onPress={handleSaveBuild} 
              className="bg-[#9fcfff] rounded p-3 mb-2"
              disabled={loading}
            >
              <Text className="text-center font-bold text-black">
                {loading ? "Saving..." : "Save"}
              </Text>
            </Pressable>
            <Pressable 
              onPress={() => setModalVisible(false)} 
              className="bg-gray-600 rounded p-3"
              disabled={loading}
            >
              <Text className="text-center font-bold text-white">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-[#9fcfff] w-4/5 p-6 rounded-xl">
            <Text className="text-lg font-bold mb-4 text-center">Choose an action!</Text>

            <Pressable
              onPress={() => {
                setActionModalVisible(false);
                Alert.alert("Info", "Edit functionality will be implemented soon");
              }}
              className="bg-green-600 rounded-xl p-3 mb-3"
              disabled={loading}
            >
              <Text className="text-center text-black font-bold">
                Edit
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (pcBuilds[selectedBuildIndex]) {
                  handleDeleteBuild(pcBuilds[selectedBuildIndex].id);
                }
              }}
              className="bg-red-500 rounded-xl p-3"
              disabled={loading}
            >
              <Text className="text-center text-black font-bold">
                {loading ? "Deleting..." : "Delete"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
}

export default Home;