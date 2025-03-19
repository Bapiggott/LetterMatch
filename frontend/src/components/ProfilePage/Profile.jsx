import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import { API_URL } from '../../config';
import LocalStorageUtils from '../../LocalStorageUtils';
import './Profile.css';

const Profile = () => {
  const token = LocalStorageUtils.getToken();
  const username = LocalStorageUtils.getUsername(); 
  // for demonstration, we assume you store the current username in localStorage

  const [profileData, setProfileData] = useState(null);
  const [status, setStatus] = useState("");

  // For new picture upload
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!token || !username) {
      setStatus("❌ Not logged in or missing username");
      return;
    }
    try {
      // If you are fetching your own user data, no "?username=..."
      // If you want to fetch a friend, do "?username=FriendName"
      const res = await fetch(`${API_URL}/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          // If your server reads username from "X-Username"
          "X-Username": username
        }
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`❌ ${data.error || "Failed to fetch profile"}`);
      } else {
        setProfileData(data);
        setStatus("");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setStatus("❌ Server error");
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatus("❌ No file selected!");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("image", selectedFile);

      const res = await fetch(`${API_URL}/profile/upload_pic_base64`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          // no "Content-Type" here because we're sending multipart/form-data
          // or if your server doesn't require token, remove it
          "X-Username": username
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`❌ ${data.error || "Upload failed"}`);
      } else {
        setStatus("✅ " + data.message);
        // re-fetch the profile to see updated base64
        fetchProfile();
      }
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("❌ Server error uploading pic");
    }
  };

  // Build data URL if we have base64
  // Typically images are .png or .jpeg
  // We'll guess "image/png" for demonstration. If you want correct type,
  // store user.profile_pic_mime in DB as well
  const getDataUrl = () => {
    if (!profileData?.profile_pic_base64) return null;
    return `data:image/png;base64,${profileData.profile_pic_base64}`;
  };

  return (
    <Layout>
      <div className="profile-container">
        <h2>My Profile</h2>
        {status && <p className="status-message">{status}</p>}

        {profileData && (
          <div className="profile-data">
            <div className="profile-item">
              <strong>Username:</strong> {profileData.username}
            </div>
            <div className="profile-item">
              <strong>Email:</strong> {profileData.email}
            </div>
            <div className="profile-item">
              <strong>Base64 Picture:</strong>
              {profileData.profile_pic_base64
                ? <span> (length: {profileData.profile_pic_base64.length} chars)</span>
                : <span> None</span>
              }
            </div>

            {/* Display the pic if we have base64 */}
            {profileData.profile_pic_base64 && (
              <div className="profile-pic">
                <img
                  src={getDataUrl()}
                  alt="Profile"
                  style={{ width: "120px", height: "120px", borderRadius: "50%" }}
                />
              </div>
            )}
          </div>
        )}

        <div className="upload-section">
          <h4>Upload New Picture</h4>
          <input type="file" onChange={handleFileChange} />
          <button onClick={handleUpload}>Upload</button>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
