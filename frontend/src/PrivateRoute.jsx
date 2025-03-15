import { Navigate, Outlet } from "react-router-dom"
import { getToken} from "./LocalStorageUtils"

const PrivateRoute = () => {
    return getToken() ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;