// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title CertificateRegistry
 * @dev Contrato para registro de certificados con IPFS CID
 * @notice Este es el contrato por defecto del sistema
 */
contract CertificateRegistry {
    
    // Estados posibles de un certificado
    enum Status { Active, Reject, Inactive }
    
    // Estructura de un certificado
    struct Certificate {
        string cid;              // CID de IPFS
        Status status;           // Estado actual
        uint256 validTo;         // Timestamp de validez (0 = sin expiración)
        uint256 timestamp;       // Timestamp de registro
        address registrar;       // Dirección del registrador
        bool exists;             // Flag de existencia
    }
    
    // Mapping principal de certificados
    mapping(string => Certificate) private certificates;
    
    // Contadores
    uint256 public totalCertificates;
    uint256 public activeCertificates;
    
    // Owner del contrato
    address public owner;
    
    // Eventos
    event CertificateRegistered(
        string indexed cid,
        uint256 validTo,
        uint256 timestamp,
        address indexed registrar
    );
    
    event StatusChanged(
        string indexed cid,
        Status newStatus,
        uint256 timestamp,
        address indexed updater
    );
    
    event CertificateExpired(
        string indexed cid,
        uint256 timestamp
    );
    
    // Modificadores
    modifier certificateExists(string memory cid) {
        require(certificates[cid].exists, "Certificate does not exist");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        totalCertificates = 0;
        activeCertificates = 0;
    }
    
    /**
     * @dev Registra un nuevo certificado
     * @param cid CID de IPFS del certificado
     * @param validTo Timestamp de validez (0 para sin expiración)
     */
    function registry(string memory cid, uint256 validTo) public {
        require(!certificates[cid].exists, "Certificate already exists");
        require(bytes(cid).length > 0, "CID cannot be empty");
        
        certificates[cid] = Certificate({
            cid: cid,
            status: Status.Active,
            validTo: validTo,
            timestamp: block.timestamp,
            registrar: msg.sender,
            exists: true
        });
        
        totalCertificates++;
        activeCertificates++;
        
        emit CertificateRegistered(cid, validTo, block.timestamp, msg.sender);
    }
    
    /**
     * @dev Cambia el estado de un certificado
     * @param cid CID del certificado
     * @param newStatus Nuevo estado (active, reject, inactive)
     */
    function changeStatus(string memory cid, string memory newStatus) 
        public 
        certificateExists(cid) 
    {
        Status oldStatus = certificates[cid].status;
        Status status;
        
        if (keccak256(bytes(newStatus)) == keccak256(bytes("active"))) {
            status = Status.Active;
        } else if (keccak256(bytes(newStatus)) == keccak256(bytes("reject"))) {
            status = Status.Reject;
        } else if (keccak256(bytes(newStatus)) == keccak256(bytes("inactive"))) {
            status = Status.Inactive;
        } else {
            revert("Invalid status");
        }
        
        certificates[cid].status = status;
        
        // Actualizar contador de activos
        if (oldStatus == Status.Active && status != Status.Active) {
            activeCertificates--;
        } else if (oldStatus != Status.Active && status == Status.Active) {
            activeCertificates++;
        }
        
        emit StatusChanged(cid, status, block.timestamp, msg.sender);
    }
    
    /**
     * @dev Obtiene la información de un certificado
     * @param cid CID del certificado
     * @return cid, status, validTo, timestamp, exists
     */
    function getRegistry(string memory cid) 
        public 
        view 
        returns (
            string memory,
            string memory status,
            uint256 validTo,
            uint256 timestamp,
            bool exists
        ) 
    {
        Certificate memory cert = certificates[cid];
        
        if (!cert.exists) {
            return ("", "notfound", 0, 0, false);
        }
        
        string memory statusStr;
        
        // Verificar si está vencido
        if (cert.validTo > 0 && block.timestamp > cert.validTo) {
            statusStr = "vencido";
        } else if (cert.status == Status.Active) {
            statusStr = "active";
        } else if (cert.status == Status.Reject) {
            statusStr = "reject";
        } else if (cert.status == Status.Inactive) {
            statusStr = "inactive";
        }
        
        return (
            cert.cid,
            statusStr,
            cert.validTo,
            cert.timestamp,
            true
        );
    }
    
    /**
     * @dev Obtiene detalles completos del certificado
     * @param cid CID del certificado
     * @return Todos los detalles del certificado
     */
    function getCertificateDetails(string memory cid)
        public
        view
        certificateExists(cid)
        returns (
            string memory,
            Status,
            uint256 validTo,
            uint256 timestamp,
            address registrar
        )
    {
        Certificate memory cert = certificates[cid];
        return (
            cert.cid,
            cert.status,
            cert.validTo,
            cert.timestamp,
            cert.registrar
        );
    }
    
    /**
     * @dev Verifica si un certificado está activo y válido
     * @param cid CID del certificado
     * @return bool true si está activo y no vencido
     */
    function isValid(string memory cid) public view returns (bool) {
        if (!certificates[cid].exists) {
            return false;
        }
        
        Certificate memory cert = certificates[cid];
        
        // Verificar estado activo
        if (cert.status != Status.Active) {
            return false;
        }
        
        // Verificar fecha de validez
        if (cert.validTo > 0 && block.timestamp > cert.validTo) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Obtiene el registrador de un certificado
     * @param cid CID del certificado
     * @return address del registrador
     */
    function getRegistrar(string memory cid) 
        public 
        view 
        certificateExists(cid) 
        returns (address) 
    {
        return certificates[cid].registrar;
    }
    
    /**
     * @dev Transfiere la propiedad del contrato
     * @param newOwner Nueva dirección del propietario
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}
